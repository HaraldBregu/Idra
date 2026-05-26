import { randomUUID } from 'node:crypto';
import type { AgentContentBlock, ToolResultBlock, Usage } from '../../provider/types';
import type { AgentToolResultStatus } from '../../../shared/agents/constants';
import { AgentHarnessEmitter } from './events';
import { InMemoryAgentHarnessOperationLogger, InMemoryAgentHarnessPersistence } from './memory';
import type {
	AgentHarnessApprovalDecision,
	AgentHarnessApprovalRequest,
	AgentHarnessConfig,
	AgentHarnessContextBuildResult,
	AgentHarnessEvent,
	AgentHarnessExecuteInput,
	AgentHarnessHookName,
	AgentHarnessMemoryRecord,
	AgentHarnessRunResult,
	AgentHarnessSession,
	AgentHarnessSkill,
	AgentHarnessSnapshot,
	AgentHarnessSubagentInput,
	AgentHarnessTool,
	AgentHarnessToolContext,
	ExecutableAgentHarness,
} from './types';
import { AGENT_HARNESS_LAYERS } from './types';

const DEFAULT_MAX_ITERATIONS = 25;
const DEFAULT_MAX_TOKENS = 4096;

export async function createAgentHarness(config: AgentHarnessConfig): Promise<ExecutableAgentHarness> {
	return new DefaultAgentHarness(config);
}

export class DefaultAgentHarness implements ExecutableAgentHarness {
	readonly id: string;
	readonly label: string;
	readonly layers = AGENT_HARNESS_LAYERS;

	private readonly persistence;
	private readonly logs;
	private readonly emitter = new AgentHarnessEmitter();
	private readonly controllers = new Map<string, AbortController>();
	private readonly loadedSkills = new Map<string, AgentHarnessSkill>();

	constructor(private readonly config: AgentHarnessConfig) {
		this.id = config.id ?? 'default';
		this.label = config.label ?? this.id;
		this.persistence = config.persistence ?? new InMemoryAgentHarnessPersistence();
		this.logs = config.logs ?? new InMemoryAgentHarnessOperationLogger();
	}

	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		return this.emitter.on(type, handler);
	}

	async execute(input: AgentHarnessExecuteInput): Promise<AgentHarnessRunResult> {
		const runId = input.runId ?? randomUUID();
		const sessionId = input.sessionId ?? runId;
		const controller = new AbortController();
		const removeAbort = this.linkAbortSignal(input.signal, controller);
		this.controllers.set(runId, controller);
		const context = input.context ?? {};
		let session = await this.loadOrCreateSession(sessionId, input.parentSessionId, input.metadata);
		const startedAt = new Date().toISOString();

		try {
			await this.log({ runId, sessionId, type: 'run.started', timestamp: startedAt, data: { task: input.task } });
			this.emit({ type: 'run.started', runId, sessionId, task: input.task });
			await this.runHooks('before_run', { runId, sessionId, input });
			const taskDecision = await this.config.safety?.reviewTask?.({ task: input.task, context });
			if (taskDecision && !taskDecision.allowed) {
				throw new Error(taskDecision.reason ?? 'Task was blocked by safety policy.');
			}

			await this.createSnapshot(session.id, 'before-run');
			const memory = await this.retrieveMemory(input.task, session, context);
			await this.ensureSkills(input.requiredSkills ?? [], session, context);
			const tools = await this.resolveTools(input.task, session, context);
			const contextBuild = await this.buildContext(input.task, session, memory, context);
			const plan = await this.resolvePlan(input.task, session, context);
			session = {
				...session,
				status: 'active',
				metadata: {
					...session.metadata,
					...contextBuild.metadata,
				},
				plan,
				updatedAt: new Date().toISOString(),
				transcript: [
					...contextBuild.messages,
					...session.transcript,
					{ role: 'user', content: input.task },
				],
			};

			const result = await this.runLoop({
				runId,
				session,
				task: input.task,
				tools,
				memory,
				context,
				systemPrompt: this.buildSystemPrompt(contextBuild, memory),
				maxIterations: input.maxIterations ?? this.config.runtime?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
				maxTokens: input.maxTokens ?? this.config.runtime?.maxTokens ?? DEFAULT_MAX_TOKENS,
				signal: controller.signal,
			});
			session = {
				...result.session,
				status: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
				updatedAt: new Date().toISOString(),
			};
			const finalResult = { ...result, session };
			await this.persistence.saveSession(session);
			await this.config.memory?.store({ session, result: finalResult, context });
			await this.runHooks('after_run', { runId, sessionId, result: finalResult });
			this.emit({
				type: 'run.finished',
				runId,
				sessionId,
				stopReason: finalResult.stopReason,
				outputChars: finalResult.finalText.length,
			});
			await this.log({
				runId,
				sessionId,
				type: 'run.finished',
				timestamp: new Date().toISOString(),
				data: { stopReason: finalResult.stopReason, outputChars: finalResult.finalText.length },
			});
			return finalResult;
		} catch (error) {
			session = {
				...session,
				status: controller.signal.aborted ? 'cancelled' : 'failed',
				updatedAt: new Date().toISOString(),
			};
			await this.persistence.saveSession(session);
			if (controller.signal.aborted) {
				this.emit({ type: 'run.cancelled', runId, sessionId });
			}
			await this.log({
				runId,
				sessionId,
				type: 'run.failed',
				timestamp: new Date().toISOString(),
				data: { error: error instanceof Error ? error.message : String(error) },
			});
			throw error;
		} finally {
			removeAbort();
			this.controllers.delete(runId);
		}
	}

	getSession(sessionId: string): Promise<AgentHarnessSession | null> {
		return this.persistence.loadSession(sessionId);
	}

	listSessions(): Promise<AgentHarnessSession[]> {
		return this.persistence.listSessions();
	}

	async resetSession(sessionId: string): Promise<void> {
		await this.persistence.deleteSession(sessionId);
	}

	abortRun(runId: string): void {
		this.controllers.get(runId)?.abort();
	}

	async createSnapshot(sessionId: string, reason?: string): Promise<AgentHarnessSnapshot> {
		const session = await this.persistence.loadSession(sessionId);
		if (!session) throw new Error(`Agent harness session not found: ${sessionId}`);
		const snapshot = {
			id: randomUUID(),
			sessionId,
			createdAt: new Date().toISOString(),
			reason,
			session,
		};
		await this.persistence.saveSnapshot(snapshot);
		this.emit({ type: 'snapshot.created', snapshotId: snapshot.id, sessionId });
		return snapshot;
	}

	async undo(snapshotId: string): Promise<AgentHarnessSession> {
		const snapshot = await this.persistence.loadSnapshot(snapshotId);
		if (!snapshot) throw new Error(`Agent harness snapshot not found: ${snapshotId}`);
		await this.persistence.saveSession(snapshot.session);
		return snapshot.session;
	}

	async discoverTools(input: { task: string; sessionId?: string; context?: Record<string, unknown> }): Promise<AgentHarnessTool[]> {
		const session = await this.loadOrCreateSession(input.sessionId ?? randomUUID());
		return this.discoverExternalTools(input.task, session, input.context ?? {});
	}

	async loadSkill(name: string, input: { sessionId?: string; context?: Record<string, unknown> } = {}): Promise<AgentHarnessSkill> {
		if (!this.config.skills) throw new Error('No agent harness skill loader is configured.');
		const session = await this.loadOrCreateSession(input.sessionId ?? randomUUID());
		const skill = await this.config.skills.load(name, { session, context: input.context ?? {} });
		this.loadedSkills.set(skill.name, skill);
		return skill;
	}

	async runSubagent(input: AgentHarnessSubagentInput & { parentSessionId?: string }): Promise<AgentHarnessRunResult> {
		const parentSession = input.parentSessionId
			? await this.persistence.loadSession(input.parentSessionId)
			: null;
		if (this.config.subagents && parentSession) {
			return this.config.subagents.run({ ...input, parentSession });
		}
		const childSessionId = input.sessionId ?? `${input.parentSessionId ?? 'root'}:subagent:${randomUUID()}`;
		return this.execute({
			task: input.task,
			sessionId: childSessionId,
			parentSessionId: input.parentSessionId,
			context: input.context,
			requiredSkills: input.requiredSkills,
		});
	}

	private async runLoop(input: {
		runId: string;
		session: AgentHarnessSession;
		task: string;
		tools: AgentHarnessTool[];
		memory: AgentHarnessMemoryRecord[];
		context: Record<string, unknown>;
		systemPrompt: string;
		maxIterations: number;
		maxTokens: number;
		signal: AbortSignal;
	}): Promise<AgentHarnessRunResult> {
		let session = input.session;
		let finalText = '';
		let toolCalls = 0;
		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason: AgentHarnessRunResult['stopReason'] = 'end_turn';

		for (let iteration = 0; iteration < input.maxIterations; iteration++) {
			if (input.signal.aborted) {
				stopReason = 'cancelled';
				break;
			}
			this.emit({ type: 'model.request', runId: input.runId, sessionId: session.id, iteration });
			await this.runHooks('before_model_call', { runId: input.runId, sessionId: session.id, iteration });
			let response: Awaited<ReturnType<DefaultAgentHarness['collectModelTurn']>>;
			try {
				response = await this.collectModelTurn({
					...input,
					session,
					iteration,
				});
			} catch (error) {
				if (input.signal.aborted || (error as Error).name === 'AbortError') {
					stopReason = 'cancelled';
					break;
				}
				throw error;
			}
			usage.inputTokens += response.usage.inputTokens;
			usage.outputTokens += response.usage.outputTokens;
			finalText += response.text;
			session = {
				...session,
				transcript: [...session.transcript, { role: 'assistant', content: response.blocks }],
				updatedAt: new Date().toISOString(),
			};
			this.emit({
				type: 'model.response',
				runId: input.runId,
				sessionId: session.id,
				iteration,
				usage: response.usage,
			});
			await this.runHooks('after_model_call', { runId: input.runId, sessionId: session.id, iteration, response });
			if (response.toolCalls.length === 0) {
				stopReason = response.stopReason === 'max_tokens' ? 'max_tokens' : 'end_turn';
				break;
			}
			for (const call of response.toolCalls) {
				toolCalls++;
				const toolResult = await this.executeToolCall({
					runId: input.runId,
					session,
					toolCallId: call.id,
					toolName: call.name,
					args: call.args,
					tools: input.tools,
					memory: input.memory,
					context: input.context,
					signal: input.signal,
				});
				session = {
					...session,
					transcript: [
						...session.transcript,
						{
							role: 'tool',
							toolUseId: call.id,
							isError: toolResult.status !== 'ok',
							status: toolResult.status,
							content: toolResult.content,
						},
					],
					updatedAt: new Date().toISOString(),
				};
			}
			if (iteration === input.maxIterations - 1) stopReason = 'max_iterations';
		}

		return {
			runId: input.runId,
			sessionId: session.id,
			finalText,
			toolCalls,
			usage,
			stopReason,
			session,
		};
	}

	private async collectModelTurn(input: {
		runId: string;
		session: AgentHarnessSession;
		tools: AgentHarnessTool[];
		systemPrompt: string;
		maxTokens: number;
		signal: AbortSignal;
		iteration: number;
	}): Promise<{
		text: string;
		blocks: AgentContentBlock[];
		toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
		usage: Usage;
		stopReason: string;
	}> {
		let text = '';
		let usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const reasoningBlocks: AgentContentBlock[] = [];
		const pending = new Map<string, { name: string; argsText: string }>();
		const tools = input.tools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			schema: tool.schema,
		}));

		for await (const event of this.config.model.stream({
			model: this.config.modelId,
			effort: this.config.effort,
			system: input.systemPrompt,
			messages: input.session.transcript,
			tools,
			maxTokens: input.maxTokens,
			signal: input.signal,
		})) {
			if (event.type === 'reasoning_item') {
				reasoningBlocks.push({
					type: 'reasoning',
					provider: event.provider ?? 'openai',
					item: event.item,
				});
			} else if (event.type === 'text_delta') {
				text += event.text;
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

		const toolCalls = [...pending].map(([id, call]) => ({
			id,
			name: call.name,
			args: this.parseToolArgs(call.name, call.argsText),
		}));
		const blocks: AgentContentBlock[] = [...reasoningBlocks];
		if (text) blocks.push({ type: 'text', text });
		for (const call of toolCalls) {
			blocks.push({ type: 'tool_use', toolUseId: call.id, toolName: call.name, toolArgs: call.args });
		}
		if (blocks.length === 0) blocks.push({ type: 'text', text: '' });
		return { text, blocks, toolCalls, usage, stopReason };
	}

	private async executeToolCall(input: {
		runId: string;
		session: AgentHarnessSession;
		toolCallId: string;
		toolName: string;
		args: Record<string, unknown>;
		tools: AgentHarnessTool[];
		memory: AgentHarnessMemoryRecord[];
		context: Record<string, unknown>;
		signal: AbortSignal;
	}): Promise<{ status: AgentToolResultStatus; content: ToolResultBlock[] }> {
		const tool = input.tools.find((entry) => entry.name === input.toolName);
		if (!tool) {
			return {
				status: 'error',
				content: [{ type: 'text', text: `tool '${input.toolName}' is not available in this run.` }],
			};
		}
		const toolContext = this.createToolContext(input.session, input.runId, input.memory, input.context, input.signal);
		this.emit({
			type: 'tool.started',
			runId: input.runId,
			sessionId: input.session.id,
			toolName: input.toolName,
			toolCallId: input.toolCallId,
		});
		await this.runHooks('before_tool_call', { ...input, tool });
		const safety = await this.config.safety?.reviewToolCall?.({
			toolName: input.toolName,
			args: input.args,
			session: input.session,
			context: input.context,
		});
		if (safety && !safety.allowed) {
			return this.finishToolCall(input, {
				status: 'blocked',
				content: [{ type: 'text', text: safety.reason ?? `Tool ${input.toolName} was blocked by safety policy.` }],
			});
		}
		const approval = await this.resolveApproval(tool, input.args, toolContext, input.toolCallId);
		if (!approval.approved) {
			return this.finishToolCall(input, {
				status: 'rejected',
				content: [{ type: 'text', text: approval.reason ?? `tool ${input.toolName} requires approval before execution.` }],
			});
		}
		try {
			const result = await tool.execute(input.args, toolContext);
			const content = await this.config.resultOptimizer?.optimize({
				toolName: input.toolName,
				content: result.content,
				details: result.details,
				context: toolContext,
			}) ?? result.content;
			await this.runHooks('after_tool_call', { ...input, tool, result: { ...result, content } });
			return this.finishToolCall(input, { status: result.status, content });
		} catch (error) {
			return this.finishToolCall(input, {
				status: 'error',
				content: [
					{
						type: 'text',
						text: `tool ${input.toolName} threw: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
			});
		}
	}

	private finishToolCall(
		input: { runId: string; session: AgentHarnessSession; toolCallId: string; toolName: string },
		result: { status: AgentToolResultStatus; content: ToolResultBlock[] }
	): { status: AgentToolResultStatus; content: ToolResultBlock[] } {
		this.emit({
			type: 'tool.finished',
			runId: input.runId,
			sessionId: input.session.id,
			toolName: input.toolName,
			toolCallId: input.toolCallId,
			status: result.status,
		});
		return result;
	}

	private createToolContext(
		session: AgentHarnessSession,
		runId: string,
		memory: AgentHarnessMemoryRecord[],
		context: Record<string, unknown>,
		signal: AbortSignal
	): AgentHarnessToolContext {
		return {
			runId,
			sessionId: session.id,
			session,
			signal,
			context,
			memory,
			emit: (event) => this.emit(event),
			log: (entry) => this.log(entry),
			requestApproval: (request) => this.requestApproval(request),
			runSubagent: (input) => this.runSubagent({ ...input, parentSessionId: session.id }),
		};
	}

	private async resolveApproval(
		tool: AgentHarnessTool,
		args: Record<string, unknown>,
		ctx: AgentHarnessToolContext,
		toolCallId: string
	): Promise<AgentHarnessApprovalDecision> {
		const requires =
			typeof tool.requiresApproval === 'function'
				? await tool.requiresApproval(args, ctx)
				: tool.requiresApproval === true;
		if (!requires) return { approved: true };
		return this.requestApproval({
			runId: ctx.runId,
			sessionId: ctx.sessionId,
			toolName: tool.name,
			toolCallId,
			args,
			reason: `tool ${tool.name} requires approval before execution.`,
		});
	}

	private async requestApproval(request: AgentHarnessApprovalRequest): Promise<AgentHarnessApprovalDecision> {
		this.emit({ type: 'approval.requested', request });
		const decision = this.config.approvals
			? await this.config.approvals.checkpoint(request)
			: { approved: false, reason: request.reason };
		this.emit({ type: 'approval.resolved', request, decision });
		return decision;
	}

	private async loadOrCreateSession(
		id: string,
		parentSessionId?: string,
		metadata?: Record<string, unknown>
	): Promise<AgentHarnessSession> {
		const existing = await this.persistence.loadSession(id);
		if (existing) return existing;
		const now = new Date().toISOString();
		const session = {
			id,
			createdAt: now,
			updatedAt: now,
			status: 'active' as const,
			model: this.config.modelId,
			provider: this.config.provider,
			parentSessionId,
			metadata,
			transcript: [],
			plan: [],
			compactionMarkers: [],
		};
		await this.persistence.saveSession(session);
		return session;
	}

	private async resolvePlan(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<AgentHarnessSession['plan']> {
		return this.config.planner
			? this.config.planner.plan({ task, session, context })
			: [{ task, status: 'in_progress' }];
	}

	private async retrieveMemory(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<AgentHarnessMemoryRecord[]> {
		return this.config.memory?.retrieve({ task, session, context }) ?? [];
	}

	private async buildContext(
		task: string,
		session: AgentHarnessSession,
		memory: AgentHarnessMemoryRecord[],
		context: Record<string, unknown>
	): Promise<Required<AgentHarnessContextBuildResult>> {
		const result = await this.config.context?.build({ task, session, memory, context });
		return {
			systemPromptAdditions: result?.systemPromptAdditions ?? [],
			messages: result?.messages ?? [],
			metadata: result?.metadata ?? {},
		};
	}

	private async resolveTools(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<AgentHarnessTool[]> {
		return [
			...(this.config.tools ?? []),
			...[...this.loadedSkills.values()].flatMap((skill) => skill.tools ?? []),
			...(await this.discoverExternalTools(task, session, context)),
		];
	}

	private async discoverExternalTools(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<AgentHarnessTool[]> {
		const discovered = await Promise.all(
			(this.config.externalTools ?? []).map((provider) => provider.discover({ task, session, context }))
		);
		return discovered.flat();
	}

	private async ensureSkills(
		names: string[],
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<void> {
		if (!this.config.skills) return;
		for (const name of names) {
			if (this.loadedSkills.has(name)) continue;
			const skill = await this.config.skills.load(name, { session, context });
			this.loadedSkills.set(skill.name, skill);
		}
	}

	private buildSystemPrompt(
		context: Required<AgentHarnessContextBuildResult>,
		memory: AgentHarnessMemoryRecord[]
	): string {
		return [
			this.config.systemPrompt ?? '',
			...context.systemPromptAdditions,
			...[...this.loadedSkills.values()].flatMap((skill) => skill.instructions ? [skill.instructions] : []),
			memory.length
				? ['Relevant memory:', ...memory.map((record) => `- ${record.text}`)].join('\n')
				: '',
		]
			.filter(Boolean)
			.join('\n\n');
	}

	private parseToolArgs(toolName: string, argsText: string): Record<string, unknown> {
		if (!argsText.trim()) return {};
		try {
			const parsed = JSON.parse(argsText) as unknown;
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as Record<string, unknown>;
			}
			return { __parsed: parsed };
		} catch (error) {
			return {
				__unparsed: argsText,
				__error: `Invalid JSON arguments for ${toolName}: ${error instanceof Error ? error.message : 'invalid JSON'}.`,
			};
		}
	}

	private emit(event: AgentHarnessEvent): void {
		this.config.events?.emit(event);
		this.emitter.emit(event);
	}

	private async log(entry: Parameters<AgentHarnessToolContext['log']>[0]): Promise<void> {
		await this.logs.append(entry);
	}

	private async runHooks(name: AgentHarnessHookName, payload: unknown): Promise<void> {
		for (const hook of this.config.hooks ?? []) {
			await hook.handle({ name, payload });
		}
	}

	private linkAbortSignal(signal: AbortSignal | undefined, controller: AbortController): () => void {
		if (!signal) return () => undefined;
		if (signal.aborted) controller.abort();
		const abort = (): void => controller.abort();
		signal.addEventListener('abort', abort, { once: true });
		return () => signal.removeEventListener('abort', abort);
	}
}
