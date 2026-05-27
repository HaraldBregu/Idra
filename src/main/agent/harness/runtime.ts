import { randomUUID } from 'node:crypto';
import type { AgentContentBlock, ToolResultBlock, Usage } from '../../provider/types';
import type { AgentToolResultStatus } from '../../../shared/agents/constants';
import { AgentHarnessEmitter, AgentHarnessEventQueue } from './events';
import { InMemoryAgentHarnessOperationLogger, InMemoryAgentHarnessPersistence } from './memory';
import { DefaultAgentHarnessSecretRedactor, validateAgentHarnessConfig } from './config';
import { compactTranscriptToBudget } from './context';
import { AgentHarnessError, isRecoverableError, toHarnessErrorShape } from './errors';
import { describeModelCandidate, estimateUsageCost } from './model';
import { validateJsonSchemaValue } from './schema';
import { DefaultAgentHarnessToolRegistry, filterToolsByPermissions, requiresPolicyApproval } from './tools';
import type {
	AgentHarnessApprovalDecision,
	AgentHarnessApprovalRequest,
	AgentHarnessConfig,
	AgentHarnessContextBuildResult,
	AgentHarnessEvent,
	AgentHarnessExecuteInput,
	AgentHarnessHookName,
	AgentHarnessModel,
	AgentHarnessModelCandidate,
	AgentHarnessModelDescriptor,
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
	private readonly redactor;
	private readonly toolRegistry;

	constructor(private readonly config: AgentHarnessConfig) {
		validateAgentHarnessConfig(config);
		this.id = config.id ?? 'default';
		this.label = config.label ?? this.id;
		this.persistence = config.persistence ?? new InMemoryAgentHarnessPersistence();
		this.logs = config.logs ?? new InMemoryAgentHarnessOperationLogger();
		this.redactor = config.secrets ?? new DefaultAgentHarnessSecretRedactor();
		this.toolRegistry = config.toolRegistry ?? new DefaultAgentHarnessToolRegistry(config.tools ?? []);
	}

	on(type: AgentHarnessEvent['type'], handler: (event: AgentHarnessEvent) => void): () => void {
		return this.emitter.on(type, handler);
	}

	async *stream(input: AgentHarnessExecuteInput): AsyncIterable<AgentHarnessEvent> {
		const queue = new AgentHarnessEventQueue();
		const off = this.emitter.onAny((event) => {
			if (!input.runId || !('runId' in event) || event.runId === input.runId) queue.push(event);
		});
		try {
			const execution = this.execute(input)
				.catch((error: unknown) => {
					const runId = input.runId ?? 'unknown';
					const sessionId = input.sessionId ?? runId;
					queue.push({ type: 'run.error', runId, sessionId, error: toHarnessErrorShape(error) });
				})
				.finally(() => queue.close());
			for await (const event of queue) {
				yield event;
			}
			await execution;
		} finally {
			off();
			queue.close();
		}
	}

	async execute(input: AgentHarnessExecuteInput): Promise<AgentHarnessRunResult> {
		const runId = input.runId ?? randomUUID();
		const sessionId = input.sessionId ?? runId;
		const controller = new AbortController();
		const removeAbort = this.linkAbortSignal(input.signal, controller);
		const timeoutMs = input.timeoutMs ?? this.config.runtime?.timeoutMs;
		const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
		this.controllers.set(runId, controller);
		const context = input.context ?? {};
		let session = await this.loadOrCreateSession(sessionId, input.parentSessionId, input.metadata);
		const startedAt = new Date().toISOString();

		try {
			await this.log({ runId, sessionId, type: 'run.started', timestamp: startedAt, data: this.redact({ task: input.task }) });
			this.emit({ type: 'run.started', runId, sessionId, task: input.task });
			await this.runHooks('before_run', { runId, sessionId, input });
			const boundaryInput = await this.config.boundary?.filterInput?.({ task: input.task, context });
			if (boundaryInput && !boundaryInput.allowed) {
				throw new AgentHarnessError({
					code: 'permission_denied',
					message: boundaryInput.reason ?? 'Input was blocked by boundary filter.',
				});
			}
			const taskDecision = await this.config.safety?.reviewTask?.({ task: input.task, context });
			if (taskDecision && !taskDecision.allowed) {
				throw new AgentHarnessError({
					code: 'permission_denied',
					message: taskDecision.reason ?? 'Task was blocked by safety policy.',
				});
			}

			await this.createSnapshot(session.id, 'before-run');
			const memory = await this.retrieveMemory(input.task, session, context);
			this.emit({ type: 'memory.read', runId, sessionId, count: memory.length });
			const modelDescriptor = this.describeActiveModel();
			await this.ensureSkills(input.task, input.requiredSkills ?? [], session, context);
			const tools = await this.resolveTools(input.task, session, context, input);
			const contextBuild = await this.buildContext(input.task, session, memory, context, modelDescriptor);
			if (contextBuild.trace) this.emit({ type: 'context.assembled', runId, sessionId, trace: contextBuild.trace });
			const plan = await this.resolvePlan(input.task, session, context);
			const assembledTranscript = contextBuild.messages.length ? contextBuild.messages : session.transcript;
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
					...assembledTranscript,
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
				maxCostUsd: input.maxCostUsd ?? this.config.runtime?.maxCostUsd,
				model: modelDescriptor,
				startedAtMs: Date.now(),
				timeoutMs,
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
			this.emit({ type: 'memory.write', runId, sessionId, count: finalResult.finalText ? 1 : 0 });
			const boundaryOutput = await this.config.boundary?.filterOutput?.({ text: finalResult.finalText, session });
			if (boundaryOutput && !boundaryOutput.allowed) {
				throw new AgentHarnessError({
					code: 'permission_denied',
					message: boundaryOutput.reason ?? 'Output was blocked by boundary filter.',
				});
			}
			await this.runHooks('after_run', { runId, sessionId, result: finalResult });
			this.emit({
				type: 'run.finished',
				runId,
				sessionId,
				stopReason: finalResult.stopReason,
				outputChars: finalResult.finalText.length,
				usage: finalResult.usage,
				costUsd: finalResult.costUsd,
			});
			await this.log({
				runId,
				sessionId,
				type: 'run.finished',
				timestamp: new Date().toISOString(),
				data: this.redact({ stopReason: finalResult.stopReason, outputChars: finalResult.finalText.length }),
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
			this.emit({ type: 'run.error', runId, sessionId, error: toHarnessErrorShape(error) });
			await this.log({
				runId,
				sessionId,
				type: 'run.failed',
				timestamp: new Date().toISOString(),
				data: this.redact({ error: error instanceof Error ? error.message : String(error) }),
			});
			throw error;
		} finally {
			if (timeout) clearTimeout(timeout);
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
		const childRunId = randomUUID();
		const childSessionId = input.sessionId ?? `${input.parentSessionId ?? 'root'}:subagent:${childRunId}`;
		this.emit({
			type: 'subagent.started',
			runId: childRunId,
			sessionId: childSessionId,
			parentSessionId: input.parentSessionId,
			task: input.task,
		});
		if (this.config.subagents && parentSession) {
			const result = await this.config.subagents.run({ ...input, sessionId: childSessionId, parentSession });
			this.emit({
				type: 'subagent.finished',
				runId: result.runId,
				sessionId: result.sessionId,
				parentSessionId: input.parentSessionId,
				stopReason: result.stopReason,
			});
			return result;
		}
		const result = await this.execute({
			runId: childRunId,
			task: input.task,
			sessionId: childSessionId,
			parentSessionId: input.parentSessionId,
			context: input.context,
			requiredSkills: input.requiredSkills,
		});
		this.emit({
			type: 'subagent.finished',
			runId: result.runId,
			sessionId: result.sessionId,
			parentSessionId: input.parentSessionId,
			stopReason: result.stopReason,
		});
		return result;
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
		maxCostUsd?: number;
		model?: AgentHarnessModelDescriptor;
		startedAtMs: number;
		timeoutMs?: number;
		signal: AbortSignal;
	}): Promise<AgentHarnessRunResult> {
		let session = input.session;
		let finalText = '';
		let toolCalls = 0;
		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let costUsd = 0;
		let stopReason: AgentHarnessRunResult['stopReason'] = 'end_turn';

		for (let iteration = 0; iteration < input.maxIterations; iteration++) {
			if (input.signal.aborted) {
				stopReason = 'cancelled';
				break;
			}
			if (this.isTimeoutExceeded(input.startedAtMs, input.timeoutMs)) {
				stopReason = 'cancelled';
				break;
			}
			if (this.isBudgetExceeded({ usage, costUsd, maxCostUsd: input.maxCostUsd })) {
				stopReason = usage.outputTokens >= input.maxTokens ? 'max_tokens' : 'error';
				break;
			}
			session = this.compactSessionForModel(session, input.model);
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
			costUsd += response.costUsd;
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
				costUsd: response.costUsd,
			});
			this.emit({ type: 'usage.updated', runId: input.runId, sessionId: session.id, usage, costUsd });
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
			await this.persistence.saveSession(session);
			if (iteration === input.maxIterations - 1) stopReason = 'max_iterations';
		}

		return {
			runId: input.runId,
			sessionId: session.id,
			finalText,
			toolCalls,
			usage,
			costUsd,
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
		costUsd: number;
		stopReason: string;
	}> {
		const candidates = this.modelCandidates();
		let lastError: unknown;
		for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
			const candidate = candidates[candidateIndex];
			if (candidateIndex > 0) {
				this.emit({
					type: 'model.fallback',
					runId: input.runId,
					sessionId: input.session.id,
					iteration: input.iteration,
					provider: candidate.provider,
					modelId: candidate.modelId,
				});
			}
			const attempts = this.config.models?.retry?.maxAttempts ?? 2;
			for (let attempt = 1; attempt <= attempts; attempt++) {
				try {
					return await this.collectModelTurnOnce(input, candidate);
				} catch (error) {
					lastError = error;
					if (input.signal.aborted || !isRecoverableError(error) || attempt >= attempts) break;
					const delayMs = this.retryDelayMs(attempt);
					this.emit({
						type: 'model.retry',
						runId: input.runId,
						sessionId: input.session.id,
						iteration: input.iteration,
						attempt,
						delayMs,
						error: toHarnessErrorShape(error),
					});
					await this.sleep(delayMs, input.signal);
				}
			}
		}
		throw new AgentHarnessError({
			code: 'provider_failed',
			message: lastError instanceof Error ? lastError.message : 'All model providers failed.',
			recoverable: isRecoverableError(lastError),
			cause: lastError,
		});
	}

	private async collectModelTurnOnce(
		input: {
			runId: string;
			session: AgentHarnessSession;
			tools: AgentHarnessTool[];
			systemPrompt: string;
			maxTokens: number;
			signal: AbortSignal;
			iteration: number;
		},
		candidate: AgentHarnessModelCandidate
	): Promise<{
		text: string;
		blocks: AgentContentBlock[];
		toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>;
		usage: Usage;
		costUsd: number;
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

		for await (const event of candidate.model.stream({
			model: candidate.modelId,
			effort: candidate.effort ?? this.config.effort,
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
				this.emit({
					type: 'model.delta',
					runId: input.runId,
					sessionId: input.session.id,
					iteration: input.iteration,
					text: event.text,
				});
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
		const descriptor = this.config.models?.registry?.get(candidate.provider, candidate.modelId);
		return { text, blocks, toolCalls, usage, costUsd: estimateUsageCost(usage, descriptor?.cost), stopReason };
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
		const startedAt = Date.now();
		const toolController = new AbortController();
		const removeAbort = this.linkAbortSignal(input.signal, toolController);
		const timeoutMs = tool.timeoutMs ?? this.config.runtime?.toolTimeoutMs;
		const timeout = timeoutMs ? setTimeout(() => toolController.abort(), timeoutMs) : undefined;
		const toolContext = this.createToolContext(input.session, input.runId, input.memory, input.context, toolController.signal);
		this.emit({
			type: 'tool.started',
			runId: input.runId,
			sessionId: input.session.id,
			toolName: input.toolName,
			toolCallId: input.toolCallId,
		});
		try {
			await this.runHooks('before_tool_call', { ...input, tool });
			const validation = validateJsonSchemaValue(tool.schema, input.args);
			if (!validation.valid) {
				return this.finishToolCall(input, {
					status: 'error',
					content: [{ type: 'text', text: `Invalid tool arguments: ${validation.errors.join('; ')}` }],
					durationMs: Date.now() - startedAt,
				});
			}
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
					durationMs: Date.now() - startedAt,
				});
			}
			const approval = await this.resolveApproval(tool, input.args, toolContext, input.toolCallId);
			if (!approval.approved) {
				return this.finishToolCall(input, {
					status: 'rejected',
					content: [{ type: 'text', text: approval.reason ?? `tool ${input.toolName} requires approval before execution.` }],
					durationMs: Date.now() - startedAt,
				});
			}
			const args = this.updatedArgs(input.args, approval.updatedArgs);
			const result = await this.withToolTimeout(tool.execute(args, toolContext), toolController.signal, input.toolName);
			const content = await this.config.resultOptimizer?.optimize({
				toolName: input.toolName,
				content: result.content,
				details: result.details,
				context: toolContext,
			}) ?? result.content;
			await this.runHooks('after_tool_call', { ...input, tool, result: { ...result, content } });
			return this.finishToolCall(input, { status: result.status, content, durationMs: Date.now() - startedAt });
		} catch (error) {
			this.emit({
				type: 'tool.error',
				runId: input.runId,
				sessionId: input.session.id,
				toolName: input.toolName,
				toolCallId: input.toolCallId,
				error: toHarnessErrorShape(error),
			});
			return this.finishToolCall(input, {
				status: 'error',
				content: [
					{
						type: 'text',
						text: `tool ${input.toolName} threw: ${error instanceof Error ? error.message : String(error)}`,
					},
				],
				durationMs: Date.now() - startedAt,
			});
		} finally {
			if (timeout) clearTimeout(timeout);
			removeAbort();
		}
	}

	private finishToolCall(
		input: { runId: string; session: AgentHarnessSession; toolCallId: string; toolName: string },
		result: { status: AgentToolResultStatus; content: ToolResultBlock[]; durationMs?: number }
	): { status: AgentToolResultStatus; content: ToolResultBlock[] } {
		this.emit({
			type: 'tool.finished',
			runId: input.runId,
			sessionId: input.session.id,
			toolName: input.toolName,
			toolCallId: input.toolCallId,
			status: result.status,
			durationMs: result.durationMs,
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
				: tool.requiresApproval === true || requiresPolicyApproval(tool, this.config.permissions);
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
		const safeRequest = { ...request, args: this.redact(request.args) };
		this.emit({ type: 'approval.requested', request: safeRequest });
		const decision = this.config.approvals
			? await this.config.approvals.checkpoint(request)
			: { approved: false, reason: request.reason };
		this.emit({ type: 'approval.resolved', request: safeRequest, decision });
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
		context: Record<string, unknown>,
		model: AgentHarnessModelDescriptor | undefined
	): Promise<Required<AgentHarnessContextBuildResult>> {
		const contextReserve = this.config.runtime?.contextReserveTokens ?? 1_500;
		const budgetTokens = model?.contextWindowTokens
			? Math.max(1_000, model.contextWindowTokens - contextReserve)
			: this.config.runtime?.maxInputTokens;
		const result = await this.config.context?.build({ task, session, memory, context, model, budgetTokens });
		return {
			systemPromptAdditions: result?.systemPromptAdditions ?? [],
			messages: result?.messages ?? [],
			metadata: result?.metadata ?? {},
			trace: result?.trace ?? {
				budgetTokens: budgetTokens ?? 0,
				estimatedTokens: 0,
				included: ['default'],
				dropped: [],
				summarized: [],
			},
		};
	}

	private async resolveTools(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>,
		input?: Pick<AgentHarnessExecuteInput, 'enabledTools' | 'disabledTools' | 'toolGroups'>
	): Promise<AgentHarnessTool[]> {
		const tools = [
			...this.toolRegistry.list(),
			...[...this.loadedSkills.values()].flatMap((skill) => skill.tools ?? []),
			...(await this.discoverExternalTools(task, session, context)),
		];
		return filterToolsByPermissions(tools, {
			permissions: this.config.permissions,
			enabledTools: input?.enabledTools,
			disabledTools: input?.disabledTools,
			toolGroups: input?.toolGroups,
		});
	}

	private async discoverExternalTools(
		task: string,
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<AgentHarnessTool[]> {
		const discovered = await Promise.all(
			(this.config.externalTools ?? []).map(async (provider) => {
				try {
					return await provider.discover({ task, session, context });
				} catch (error) {
					this.emit({
						type: 'tool.discovered',
						provider: 'external-error',
						count: 0,
						names: [toHarnessErrorShape(error).message],
					});
					return [];
				}
			})
		);
		return discovered.flat();
	}

	private async ensureSkills(
		task: string,
		names: string[],
		session: AgentHarnessSession,
		context: Record<string, unknown>
	): Promise<void> {
		if (!this.config.skills) return;
		const candidates = await this.config.skills.list?.({ session, context }) ?? [];
		const selected = await this.config.skills.select?.({ task, session, context, candidates }) ?? [];
		const allowed = this.config.permissions?.allowSkills ? new Set(this.config.permissions.allowSkills) : undefined;
		const denied = new Set(this.config.permissions?.denySkills ?? []);
		for (const name of [...new Set([...names, ...selected])]) {
			if (allowed && !allowed.has(name)) continue;
			if (denied.has(name)) continue;
			if (this.loadedSkills.has(name)) continue;
			const skill = await this.config.skills.load(name, { session, context });
			this.loadedSkills.set(skill.name, skill);
			this.emit({ type: 'skill.loaded', name: skill.name });
		}
	}

	private describeActiveModel(): AgentHarnessModelDescriptor | undefined {
		return this.config.models?.registry?.get(this.config.provider, this.config.modelId);
	}

	private modelCandidates(): AgentHarnessModelCandidate[] {
		return [
			{
				provider: this.config.provider,
				modelId: this.config.modelId,
				model: this.config.model,
				effort: this.config.effort,
			},
			...(this.config.models?.fallbacks ?? []),
		];
	}

	private compactSessionForModel(
		session: AgentHarnessSession,
		model: AgentHarnessModelDescriptor | undefined
	): AgentHarnessSession {
		const inputBudget = this.config.runtime?.maxInputTokens ??
			(model?.contextWindowTokens ? Math.max(1_000, model.contextWindowTokens - (this.config.runtime?.contextReserveTokens ?? 1_500)) : undefined);
		if (!inputBudget) return session;
		const compacted = compactTranscriptToBudget(session.transcript, inputBudget);
		if (compacted.transcript.length === session.transcript.length) return session;
		return {
			...session,
			transcript: compacted.transcript,
			metadata: {
				...session.metadata,
				lastContextCompaction: compacted.trace,
			},
			updatedAt: new Date().toISOString(),
		};
	}

	private isBudgetExceeded(input: {
		usage: Usage;
		costUsd: number;
		maxCostUsd?: number;
	}): boolean {
		if (this.config.runtime?.maxInputTokens && input.usage.inputTokens >= this.config.runtime.maxInputTokens) return true;
		if (this.config.runtime?.maxOutputTokens && input.usage.outputTokens >= this.config.runtime.maxOutputTokens) return true;
		if (input.maxCostUsd && input.costUsd >= input.maxCostUsd) return true;
		return false;
	}

	private isTimeoutExceeded(startedAtMs: number, timeoutMs: number | undefined): boolean {
		return timeoutMs !== undefined && Date.now() - startedAtMs >= timeoutMs;
	}

	private updatedArgs(current: Record<string, unknown>, updated: unknown): Record<string, unknown> {
		if (!updated || typeof updated !== 'object' || Array.isArray(updated)) return current;
		return updated as Record<string, unknown>;
	}

	private async withToolTimeout<T>(work: Promise<T>, signal: AbortSignal, toolName: string): Promise<T> {
		if (signal.aborted) {
			throw new AgentHarnessError({
				code: 'tool_failed',
				message: `Tool ${toolName} timed out or was cancelled.`,
				recoverable: true,
			});
		}
		return Promise.race([
			work,
			new Promise<T>((_, reject) => {
				signal.addEventListener(
					'abort',
					() => reject(new AgentHarnessError({
						code: 'tool_failed',
						message: `Tool ${toolName} timed out or was cancelled.`,
						recoverable: true,
					})),
					{ once: true }
				);
			}),
		]);
	}

	private retryDelayMs(attempt: number): number {
		const policy = this.config.models?.retry;
		const base = policy?.baseDelayMs ?? 250;
		const max = policy?.maxDelayMs ?? 5_000;
		return Math.min(max, base * 2 ** Math.max(0, attempt - 1));
	}

	private sleep(ms: number, signal: AbortSignal): Promise<void> {
		if (signal.aborted) return Promise.resolve();
		return new Promise((resolve) => {
			const timeout = setTimeout(resolve, ms);
			signal.addEventListener(
				'abort',
				() => {
					clearTimeout(timeout);
					resolve();
				},
				{ once: true }
			);
		});
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
		await this.logs.append({
			...entry,
			data: entry.data ? this.redact(entry.data) as Record<string, unknown> : undefined,
		});
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

	private redact(value: unknown): unknown {
		return this.redactor.redact(value);
	}
}
