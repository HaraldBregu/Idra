import { randomUUID } from 'node:crypto';
import type { AgentContentBlock, ToolResultBlock, Usage } from '../../provider/types';
import { AgentHarnessEmitter, AgentHarnessEventQueue } from './events';
import { validateAgentHarnessConfig, DefaultAgentHarnessSecretRedactor } from './config';
import { InMemoryAgentHarnessOperationLogger, InMemoryAgentHarnessPersistence } from './memory';
import { BudgetedAgentHarnessContextManager } from './context';
import { toRuntimeErrorShape } from './errors';
import { validateJsonSchemaValue } from './schema';
import { DefaultAgentHarnessToolRegistry, filterToolsByPermissions, requiresPolicyApproval } from './tools';
import type { AgentHarnessConfig, AgentHarnessEvent, AgentHarnessExecuteInput, AgentHarnessHookName, AgentHarnessRunResult, AgentHarnessSession, AgentHarnessSnapshot, AgentHarnessSubagentInput, AgentHarnessTool } from './types';
import { AGENT_HARNESS_LAYERS } from './types';

const DEFAULT_MAX_ITERATIONS = 25;
const DEFAULT_MAX_TOKENS = 4096;

export async function createAgentHarness(config: AgentHarnessConfig) {
	return new DefaultAgentHarness(config);
}

export class DefaultAgentHarness {
	readonly id: string;
	readonly label: string;
	readonly layers = AGENT_HARNESS_LAYERS;
	private readonly persistence;
	private readonly logs;
	private readonly redactor;
	private readonly tools;
	private readonly context;
	private readonly emitter = new AgentHarnessEmitter();
	private readonly controllers = new Map<string, AbortController>();
	private readonly loadedSkills = new Map<string, { instructions?: string; tools?: AgentHarnessTool[] }>();

	constructor(private readonly config: AgentHarnessConfig) {
		validateAgentHarnessConfig(config);
		this.id = config.id ?? 'default';
		this.label = config.label ?? this.id;
		this.persistence = config.persistence ?? new InMemoryAgentHarnessPersistence();
		this.logs = config.logs ?? new InMemoryAgentHarnessOperationLogger();
		this.redactor = config.secrets ?? new DefaultAgentHarnessSecretRedactor();
		this.tools = config.toolRegistry ?? new DefaultAgentHarnessToolRegistry(config.tools ?? []);
		this.context = config.context ?? new BudgetedAgentHarnessContextManager();
	}

	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		return this.emitter.on(type, handler);
	}

	async *stream(input: AgentHarnessExecuteInput): AsyncIterable<AgentHarnessEvent> {
		const queue = new AgentHarnessEventQueue();
		const off = this.emitter.onAny((event) => queue.push(event));
		void this.execute(input).catch((error) => queue.push({ type: 'run.error', runId: input.runId ?? 'unknown', sessionId: input.sessionId ?? 'unknown', error: toRuntimeErrorShape(error) })).finally(() => queue.close());
		try {
			for await (const event of queue) yield event;
		} finally {
			off();
		}
	}

	async execute(input: AgentHarnessExecuteInput): Promise<AgentHarnessRunResult> {
		const runId = input.runId ?? randomUUID();
		const session = await this.loadOrCreateSession(input.sessionId ?? runId, input.parentSessionId, input.metadata);
		const controller = new AbortController();
		this.controllers.set(runId, controller);
		const context = input.context ?? {};
		try {
			await this.runHooks('before_run', { runId, sessionId: session.id, input });
			this.emit({ type: 'run.started', runId, sessionId: session.id, task: input.task });
			await this.logs.append({ runId, sessionId: session.id, type: 'run.started', timestamp: new Date().toISOString(), data: { task: input.task } });
			const memory = await this.config.memory?.retrieve({ task: input.task, session, context }) ?? [];
			this.emit({ type: 'memory.read', runId, sessionId: session.id, count: memory.length });
			await this.ensureSkills(input.task, input.requiredSkills ?? [], session, context);
			const contextBuild = await this.context.build({ task: input.task, session, memory, context, budgetTokens: this.config.runtime?.maxInputTokens });
			if (contextBuild.trace) this.emit({ type: 'context.assembled', runId, sessionId: session.id, trace: contextBuild.trace });
			const tools = await this.resolveTools(input, session, context);
			const plan = await this.config.planner?.plan({ task: input.task, session, context }) ?? [];
			const result = await this.runLoop({
				runId,
				session: { ...session, plan, transcript: [...(contextBuild.messages ?? session.transcript), { role: 'user', content: input.task }], updatedAt: new Date().toISOString() },
				task: input.task,
				systemPrompt: [
					this.config.systemPrompt,
					...(contextBuild.systemPromptAdditions ?? []),
					...[...this.loadedSkills.values()].flatMap((skill) => skill.instructions ? [skill.instructions] : []),
					memory.length ? ['Relevant memory:', ...memory.map((record) => `- ${record.text}`)].join('\n') : '',
				].filter(Boolean).join('\n\n'),
				tools,
				context,
				memory,
				maxIterations: input.maxIterations ?? this.config.runtime?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
				maxTokens: input.maxTokens ?? this.config.runtime?.maxTokens ?? DEFAULT_MAX_TOKENS,
				signal: controller.signal,
			});
			const finalSession = { ...result.session, status: 'completed' as const, updatedAt: new Date().toISOString() };
			const finalResult = { ...result, session: finalSession };
			await this.persistence.saveSession(finalSession);
			await this.config.memory?.store({ session: finalSession, result: finalResult, context });
			this.emit({ type: 'memory.write', runId, sessionId: session.id, count: finalResult.finalText ? 1 : 0 });
			await this.runHooks('after_run', { runId, sessionId: session.id, result: finalResult });
			this.emit({ type: 'run.finished', runId, sessionId: session.id, stopReason: finalResult.stopReason, outputChars: finalResult.finalText.length, usage: finalResult.usage });
			await this.logs.append({ runId, sessionId: session.id, type: 'run.finished', timestamp: new Date().toISOString(), data: { stopReason: finalResult.stopReason } });
			return finalResult;
		} catch (error) {
			this.emit({ type: 'run.error', runId, sessionId: session.id, error: toRuntimeErrorShape(error) });
			throw error;
		} finally {
			this.controllers.delete(runId);
		}
	}

	private async runLoop(input: { runId: string; session: AgentHarnessSession; task: string; systemPrompt: string; tools: AgentHarnessTool[]; context: Record<string, unknown>; memory: unknown[]; maxIterations: number; maxTokens: number; signal: AbortSignal }): Promise<AgentHarnessRunResult> {
		let session = input.session;
		let finalText = '';
		let toolCalls = 0;
		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		for (let iteration = 0; iteration < input.maxIterations; iteration++) {
			this.emit({ type: 'model.request', runId: input.runId, sessionId: session.id, iteration });
			await this.runHooks('before_model_call', { runId: input.runId, sessionId: session.id, iteration });
			const response = await this.collectModelTurn(input.runId, session, input.systemPrompt, input.tools, input.maxTokens, input.signal, iteration);
			usage.inputTokens += response.usage.inputTokens;
			usage.outputTokens += response.usage.outputTokens;
			finalText += response.text;
			session = { ...session, transcript: [...session.transcript, { role: 'assistant', content: response.blocks }], updatedAt: new Date().toISOString() };
			this.emit({ type: 'model.response', runId: input.runId, sessionId: session.id, iteration, usage: response.usage });
			await this.runHooks('after_model_call', { runId: input.runId, sessionId: session.id, iteration, response });
			if (response.toolCalls.length === 0) return { runId: input.runId, sessionId: session.id, finalText, toolCalls, usage, stopReason: response.stopReason === 'max_tokens' ? 'max_tokens' : 'end_turn', session };
			for (const call of response.toolCalls) {
				toolCalls++;
				const result = await this.executeToolCall(input.runId, session, call.id, call.name, call.args, input.tools, input.context, input.signal);
				session = { ...session, transcript: [...session.transcript, { role: 'tool', toolUseId: call.id, status: result.status, isError: result.status !== 'ok', content: result.content }], updatedAt: new Date().toISOString() };
			}
			await this.persistence.saveSession(session);
		}
		return { runId: input.runId, sessionId: session.id, finalText, toolCalls, usage, stopReason: 'max_iterations', session };
	}

	private async collectModelTurn(runId: string, session: AgentHarnessSession, system: string, tools: AgentHarnessTool[], maxTokens: number, signal: AbortSignal, iteration: number) {
		let text = '';
		let usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const pending = new Map<string, { name: string; argsText: string }>();
		for await (const event of this.config.model.stream({ model: this.config.modelId, effort: this.config.effort, system, messages: session.transcript, tools: tools.map((tool) => ({ name: tool.name, description: tool.description, schema: tool.schema })), maxTokens, signal })) {
			if (event.type === 'text_delta') {
				text += event.text;
				this.emit({ type: 'model.delta', runId, sessionId: session.id, iteration, text: event.text });
			} else if (event.type === 'tool_call_start') {
				pending.set(event.id, { name: event.name, argsText: '' });
			} else if (event.type === 'tool_call_args_delta') {
				const call = pending.get(event.id);
				if (call) call.argsText += event.jsonDelta;
			} else if (event.type === 'message_end') {
				usage = event.usage;
				stopReason = event.stopReason;
			}
		}
		const toolCalls = [...pending].map(([id, call]) => ({ id, name: call.name, args: parseArgs(call.argsText) }));
		const blocks: AgentContentBlock[] = text ? [{ type: 'text', text }] : [];
		toolCalls.forEach((call) => blocks.push({ type: 'tool_use', toolUseId: call.id, toolName: call.name, toolArgs: call.args }));
		return { text, usage, stopReason, toolCalls, blocks: blocks.length ? blocks : [{ type: 'text' as const, text: '' }] };
	}

	private async executeToolCall(runId: string, session: AgentHarnessSession, toolCallId: string, toolName: string, args: Record<string, unknown>, tools: AgentHarnessTool[], context: Record<string, unknown>, signal: AbortSignal): Promise<{ status: import('../../../shared/agents/constants').AgentToolResultStatus; content: ToolResultBlock[] }> {
		const tool = tools.find((entry) => entry.name === toolName);
		if (!tool) return { status: 'error', content: [{ type: 'text', text: `tool ${toolName} is unavailable` }] };
		const started = Date.now();
		this.emit({ type: 'tool.started', runId, sessionId: session.id, toolName, toolCallId });
		const finish = async (status: import('../../../shared/agents/constants').AgentToolResultStatus, content: ToolResultBlock[]) => {
			await this.runHooks('after_tool_call', { runId, sessionId: session.id, toolCallId, toolName, tool, args, result: { status, content }, durationMs: Date.now() - started });
			await this.logs.append({ runId, sessionId: session.id, type: 'tool.executed', timestamp: new Date().toISOString(), data: { toolName, toolCallId, status } });
			this.emit({ type: 'tool.finished', runId, sessionId: session.id, toolName, toolCallId, status, durationMs: Date.now() - started });
			return { status, content };
		};
		await this.runHooks('before_tool_call', { runId, sessionId: session.id, toolCallId, toolName, tool, args });
		const validation = validateJsonSchemaValue(tool.schema, args);
		if (!validation.valid) return finish('error', [{ type: 'text', text: validation.errors.join('; ') }]);
		const safety = await this.config.safety?.reviewToolCall?.({ toolName, args, session, context });
		if (safety && !safety.allowed) return finish('blocked', [{ type: 'text', text: safety.reason ?? 'blocked' }]);
		const requires = typeof tool.requiresApproval === 'function' ? await tool.requiresApproval(args, this.toolContext(runId, session, signal, context)) : tool.requiresApproval || requiresPolicyApproval(tool, this.config.permissions);
		if (requires) {
			const request = { runId, sessionId: session.id, toolName, toolCallId, args: this.redactor.redact(args), reason: `tool ${toolName} requires approval` };
			this.emit({ type: 'approval.requested', request });
			const decision = this.config.approvals ? await this.config.approvals.checkpoint({ ...request, args }) : { approved: false, reason: request.reason };
			this.emit({ type: 'approval.resolved', request, decision: this.redactor.redact(decision) as typeof decision });
			if (!decision.approved) return finish('rejected', [{ type: 'text', text: decision.reason ?? 'rejected' }]);
		}
		try {
			const result = await tool.execute(args, this.toolContext(runId, session, signal, context));
			const content = await this.config.resultOptimizer?.optimize({ toolName, content: result.content, details: result.details, context: this.toolContext(runId, session, signal, context) }) ?? result.content;
			return finish(result.status, content);
		} catch (error) {
			this.emit({ type: 'tool.error', runId, sessionId: session.id, toolName, toolCallId, error: toRuntimeErrorShape(error) });
			return finish('error', [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]);
		}
	}

	private toolContext(runId: string, session: AgentHarnessSession, signal: AbortSignal, context: Record<string, unknown>) {
		return { runId, sessionId: session.id, session, signal, context, memory: [], emit: (event: AgentHarnessEvent) => this.emit(event), log: (entry: Parameters<typeof this.logs.append>[0]) => this.logs.append(entry), requestApproval: (request: never) => this.config.approvals?.checkpoint(request) ?? Promise.resolve({ approved: false }), runSubagent: (input: AgentHarnessSubagentInput) => this.runSubagent({ ...input, parentSessionId: session.id }) };
	}

	private async resolveTools(input: AgentHarnessExecuteInput, session: AgentHarnessSession, context: Record<string, unknown>): Promise<AgentHarnessTool[]> {
		const external = (await Promise.all((this.config.externalTools ?? []).map((provider) => provider.discover({ task: input.task, session, context }).catch(() => [])))).flat();
		const skillTools = [...this.loadedSkills.values()].flatMap((skill) => skill.tools ?? []);
		const tools = [...this.tools.list(), ...skillTools, ...external];
		const unique = tools.filter((tool, index) => tools.findIndex((entry) => entry.name === tool.name) === index);
		return filterToolsByPermissions(unique, { permissions: this.config.permissions, enabledTools: input.enabledTools, disabledTools: input.disabledTools, toolGroups: input.toolGroups });
	}

	private async loadOrCreateSession(id: string, parentSessionId?: string, metadata?: Record<string, unknown>): Promise<AgentHarnessSession> {
		const existing = await this.persistence.loadSession(id);
		if (existing) return existing;
		const now = new Date().toISOString();
		const session: AgentHarnessSession = { id, createdAt: now, updatedAt: now, status: 'active', model: this.config.modelId, provider: this.config.provider, parentSessionId, metadata, transcript: [], plan: [], compactionMarkers: [] };
		await this.persistence.saveSession(session);
		return session;
	}

	private async ensureSkills(task: string, names: string[], session: AgentHarnessSession, context: Record<string, unknown>): Promise<void> {
		if (!this.config.skills) return;
		const candidates = await this.config.skills.list?.({ session, context }) ?? [];
		const selected = await this.config.skills.select?.({ task, session, context, candidates }) ?? [];
		const denied = new Set(this.config.permissions?.denySkills ?? []);
		const allowed = this.config.permissions?.allowSkills ? new Set(this.config.permissions.allowSkills) : undefined;
		for (const name of [...new Set([...names, ...selected])]) {
			if (denied.has(name) || (allowed && !allowed.has(name)) || this.loadedSkills.has(name)) continue;
			const skill = await this.config.skills.load(name, { session, context });
			this.loadedSkills.set(skill.name, skill);
			this.emit({ type: 'skill.loaded', name: skill.name });
		}
	}

	getSession(sessionId: string) { return this.persistence.loadSession(sessionId); }
	listSessions() { return this.persistence.listSessions(); }
	async resetSession(sessionId: string) { await this.persistence.deleteSession(sessionId); }
	abortRun(runId: string): void { this.controllers.get(runId)?.abort(); }
	async createSnapshot(sessionId: string, reason?: string): Promise<AgentHarnessSnapshot> {
		const session = await this.persistence.loadSession(sessionId);
		if (!session) throw new Error(`session not found: ${sessionId}`);
		const snapshot = { id: randomUUID(), sessionId, createdAt: new Date().toISOString(), reason, session };
		await this.persistence.saveSnapshot(snapshot);
		this.emit({ type: 'snapshot.created', snapshotId: snapshot.id, sessionId });
		return snapshot;
	}
	async undo(snapshotId: string): Promise<AgentHarnessSession> {
		const snapshot = await this.persistence.loadSnapshot(snapshotId);
		if (!snapshot) throw new Error(`snapshot not found: ${snapshotId}`);
		await this.persistence.saveSession(snapshot.session);
		return snapshot.session;
	}
	async runSubagent(input: AgentHarnessSubagentInput & { parentSessionId?: string }): Promise<AgentHarnessRunResult> {
		return this.execute({ task: input.task, sessionId: input.sessionId ?? `${input.parentSessionId ?? 'root'}:${randomUUID()}`, parentSessionId: input.parentSessionId, context: input.context, requiredSkills: input.requiredSkills });
	}
	private emit(event: AgentHarnessEvent): void { this.config.events?.emit(event); this.emitter.emit(event); }
	private async runHooks(name: AgentHarnessHookName, payload: unknown): Promise<void> {
		for (const hook of this.config.hooks ?? []) {
			try { await hook.handle({ name, payload }); } catch (error) { await this.logs.append({ type: 'hook.error', timestamp: new Date().toISOString(), data: { lifecycle: name, hook: hook.name, error: error instanceof Error ? error.message : String(error) } }); }
		}
	}
}

function parseArgs(text: string): Record<string, unknown> {
	if (!text.trim()) return {};
	try {
		const parsed = JSON.parse(text) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed };
	} catch {
		return { __unparsed: text };
	}
}
