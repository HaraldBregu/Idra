import { beforeToolCall, newCallTracker } from '../tools/before-call';
import type { AgentTool, AgentToolResult } from '../tools/types';
import type { SkillAuditLog } from './audit-log';
import type { SkillPreferenceStore } from './preferences';
import type { SkillRegistry } from './registry';
import { validateJsonSchema } from './schema';
import type {
	MemoryRetriever,
	SkillDefinition,
	SkillError,
	SkillExecutionContext,
	SkillExecutionRequest,
	SkillExecutionRequestContext,
	SkillMemoryRead,
	SkillMemoryWrite,
	SkillProvenance,
	SkillResult,
} from './types';
import { createProvenance, skillKey } from './types';

interface ExecutionState {
	usedSkills: string[];
	usedTools: string[];
	usedConnectors: string[];
	memoryReads: SkillMemoryRead[];
	memoryWrites: SkillMemoryWrite[];
	warnings: string[];
	provenance: SkillProvenance;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 1;

function unique(values: string[]): string[] {
	return Array.from(new Set(values));
}

function errorResult<TOutput>(
	error: SkillError,
	state: ExecutionState,
	startedAt: string,
	retryCount: number,
	metadata: Record<string, unknown> = {}
): SkillResult<TOutput> {
	const finishedAt = new Date().toISOString();
	return {
		success: false,
		error,
		warnings: state.warnings,
		provenance: { ...state.provenance, finishedAt },
		usedSkills: unique(state.usedSkills),
		usedTools: unique(state.usedTools),
		usedConnectors: unique(state.usedConnectors),
		memoryReads: state.memoryReads,
		memoryWrites: state.memoryWrites,
		startedAt,
		finishedAt,
		durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
		retryCount,
		metadata,
	};
}

function isRetryable(error?: SkillError): boolean {
	return error?.retryable === true;
}

function isAbort(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

function asSkillError(error: unknown): SkillError {
	if (isAbort(error)) return { code: 'cancelled', message: 'Skill execution cancelled.' };
	if (error instanceof Error) {
		return { code: 'execution_failed', message: error.message, retryable: false };
	}
	return { code: 'execution_failed', message: String(error), retryable: false };
}

function scopedTools(skill: SkillDefinition, available: ReadonlyMap<string, AgentTool>): Map<string, AgentTool> {
	const allowed = new Set([...skill.requiredTools, ...skill.contract.allowedTools]);
	const out = new Map<string, AgentTool>();
	for (const name of allowed) {
		const tool = available.get(name);
		if (tool) out.set(name, tool);
	}
	return out;
}

function timeoutPromise<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		if (signal?.aborted) {
			reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
			return;
		}
		const timeout = setTimeout(() => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })), timeoutMs);
		const abort = (): void => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
		signal?.addEventListener('abort', abort, { once: true });
		promise
			.then(resolve, reject)
			.finally(() => {
				clearTimeout(timeout);
				signal?.removeEventListener('abort', abort);
			});
	});
}

export class SkillExecutionEngine {
	constructor(
		private readonly registry: SkillRegistry,
		private readonly auditLog: SkillAuditLog,
		private readonly preferences: SkillPreferenceStore
	) {}

	async execute<TInput = unknown, TOutput = unknown>(
		request: SkillExecutionRequest<TInput>
	): Promise<SkillResult<TOutput>> {
		const skill = this.registry.getSkill<TInput, TOutput>(request.skillId, request.version);
		const startedAt = new Date().toISOString();
		const placeholderSkill = skill ?? ({
			id: request.skillId,
			version: request.version ?? 'unknown',
		} as SkillDefinition);
		const state: ExecutionState = {
			usedSkills: [skillKey(request.skillId, request.version ?? skill?.version ?? 'unknown')],
			usedTools: [],
			usedConnectors: [],
			memoryReads: [],
			memoryWrites: [],
			warnings: [],
			provenance: createProvenance(
				placeholderSkill,
				request.context.parentSkillId,
				request.context.provenanceChain,
				startedAt
			),
		};

		if (!skill) {
			return errorResult<TOutput>(
				{ code: 'not_found', message: `Skill not found: ${request.skillId}` },
				state,
				startedAt,
				0
			);
		}

		const inputValidation = validateJsonSchema(skill.inputSchema, request.input);
		if (!inputValidation.valid) {
			const result = errorResult<TOutput>(
				{ code: 'input_invalid', message: inputValidation.errors.join('; ') },
				state,
				startedAt,
				0
			);
			this.auditLog.record(skill, request.context, request.input, result);
			return result;
		}

		const safety = await request.context.safetyPolicy.checkBeforeExecution(skill, request.input, request.context);
		state.warnings.push(...safety.warnings);
		if (!safety.allowed) {
			const result = errorResult<TOutput>(
				{ code: 'safety_denied', message: safety.reasons.join('; ') },
				state,
				startedAt,
				0
			);
			this.auditLog.record(skill, request.context, request.input, result);
			return result;
		}
		if (skill.deprecated) state.warnings.push(`Skill is deprecated: ${skill.id}@${skill.version}`);

		let retryCount = 0;
		const maxRetries = request.context.maxRetries ?? DEFAULT_MAX_RETRIES;
		let result: SkillResult<TOutput>;

		for (;;) {
			try {
				const context = this.createExecutionContext(skill, request.context, state, startedAt, retryCount);
				const raw = await timeoutPromise(
					skill.execute(request.input, context),
					request.context.timeoutMs ?? DEFAULT_TIMEOUT_MS,
					request.context.cancellationToken
				);
				result = this.normalizeResult(skill, raw, state, startedAt, retryCount);
				if (!result.success && isRetryable(result.error) && retryCount < maxRetries) {
					retryCount++;
					continue;
				}
				break;
			} catch (error) {
				const skillError = asSkillError(error);
				if (skillError.code === 'execution_failed' && retryCount < maxRetries) {
					retryCount++;
					continue;
				}
				if (error instanceof Error && error.name === 'TimeoutError') {
					skillError.code = 'timeout';
					skillError.message = 'Skill execution timed out.';
				}
				result = errorResult<TOutput>(skillError, state, startedAt, retryCount);
				break;
			}
		}

		const outputValidation = result.success
			? validateJsonSchema(skill.outputSchema, result.data)
			: { valid: true, errors: [] };
		if (!outputValidation.valid) {
			result = errorResult<TOutput>(
				{ code: 'output_invalid', message: outputValidation.errors.join('; ') },
				state,
				startedAt,
				retryCount,
				result.metadata
			);
		}

		this.auditLog.record(skill, request.context, request.input, result);
		await this.preferences.recordOutcome(request.context.userId, skill.id, result);
		return result;
	}

	private createExecutionContext(
		skill: SkillDefinition,
		base: SkillExecutionRequestContext,
		state: ExecutionState,
		startedAt: string,
		retryCount: number
	): SkillExecutionContext {
		const tools = scopedTools(skill, base.allowedTools);
		const tracker = newCallTracker();
		const memory = this.createMemoryGateway(base.memory, base, state);
		const executionContext: SkillExecutionContext = {
			userId: base.userId,
			sessionId: base.sessionId,
			memory,
			allowedTools: tools,
			allowedConnectors: base.allowedConnectors,
			permissions: new Set(skill.permissionsRequired),
			userPreferences: base.userPreferences,
			currentPlan: base.currentPlan,
			cancellationToken: base.cancellationToken,
			logger: base.logger,
			safetyPolicy: base.safetyPolicy,
			skillDepth: base.skillDepth,
			parentSkillId: base.parentSkillId,
			provenanceChain: [...base.provenanceChain, state.provenance],
			callTool: async <TDetails = unknown>(
				name: string,
				args: Record<string, unknown>
			): Promise<AgentToolResult<TDetails>> => {
				const tool = tools.get(name);
				if (!tool) throw new Error(`Skill ${skill.id} cannot use tool: ${name}`);
				const safety = await base.safetyPolicy.checkToolUse(skill, name, args, base);
				state.warnings.push(...safety.warnings);
				if (!safety.allowed) throw new Error(safety.reasons.join('; '));
				const before = await beforeToolCall(tool, args, base.toolContext, tracker);
				if (!before.proceed && before.vetoResult) {
					state.warnings.push(before.vetoResult.content.map((item) => item.text ?? '').join(' '));
					return before.vetoResult as AgentToolResult<TDetails>;
				}
				if (before.warning) state.warnings.push(before.warning);
				const result = await tool.execute(args, base.toolContext);
				state.usedTools.push(name);
				state.provenance.toolsUsed.push(name);
				return result as AgentToolResult<TDetails>;
			},
			callConnector: async (connectorId: string, toolName: string, args: unknown): Promise<unknown> => {
				const connector = base.allowedConnectors.get(connectorId);
				if (!connector) throw new Error(`Skill ${skill.id} cannot use connector: ${connectorId}`);
				const safety = await base.safetyPolicy.checkConnectorUse(
					skill,
					connectorId,
					toolName,
					args,
					base
				);
				state.warnings.push(...safety.warnings);
				if (!safety.allowed) throw new Error(safety.reasons.join('; '));
				const result = await connector.call(toolName, args);
				state.usedConnectors.push(connectorId);
				state.provenance.connectorsUsed.push(connectorId);
				return result;
			},
			executeSkill: async <TInput = unknown, TOutput = unknown>(
				skillId: string,
				input: TInput,
				options?: { version?: string }
			): Promise<SkillResult<TOutput>> => {
				const nested = await this.execute<TInput, TOutput>({
					skillId,
					version: options?.version,
					input,
					context: {
						...base,
						parentSkillId: skill.id,
						skillDepth: base.skillDepth + 1,
						provenanceChain: [...base.provenanceChain, state.provenance],
					},
				});
				state.usedSkills.push(...nested.usedSkills);
				state.usedTools.push(...nested.usedTools);
				state.usedConnectors.push(...nested.usedConnectors);
				state.memoryReads.push(...nested.memoryReads);
				state.memoryWrites.push(...nested.memoryWrites);
				state.warnings.push(...nested.warnings);
				return nested;
			},
			proposeMemoryWrite: async (write) => {
				const decision = await base.memoryPolicy.evaluateWrite(write, executionContext);
				if (decision.allowed && base.memoryPolicy.commitWrite) {
					const committed = await base.memoryPolicy.commitWrite(write, executionContext);
					if (committed.allowed) state.memoryWrites.push(write);
					return committed;
				}
				if (decision.allowed) state.memoryWrites.push(write);
				return decision;
			},
			complete: <TOutput>(data: TOutput, metadata: Record<string, unknown> = {}) => ({
				success: true,
				data,
				warnings: [],
				provenance: state.provenance,
				usedSkills: [],
				usedTools: [],
				usedConnectors: [],
				memoryReads: [],
				memoryWrites: [],
				startedAt,
				finishedAt: new Date().toISOString(),
				durationMs: Date.now() - Date.parse(startedAt),
				retryCount,
				metadata,
			}),
			fail: <TOutput = never>(
				error: SkillError,
				metadata: Record<string, unknown> = {}
			): SkillResult<TOutput> => ({
				success: false,
				error,
				warnings: [],
				provenance: state.provenance,
				usedSkills: [],
				usedTools: [],
				usedConnectors: [],
				memoryReads: [],
				memoryWrites: [],
				startedAt,
				finishedAt: new Date().toISOString(),
				durationMs: Date.now() - Date.parse(startedAt),
				retryCount,
				metadata,
			}),
		};
		return executionContext;
	}

	private createMemoryGateway(
		memory: MemoryRetriever,
		base: SkillExecutionRequestContext,
		state: ExecutionState
	): MemoryRetriever {
		return {
			read: async (kind, query) => {
				const gate = {
					...base,
					memory,
				} as unknown as SkillExecutionContext;
				if (!base.memoryPolicy.canRead(kind, gate)) {
					throw new Error(`Memory policy denied read: ${kind}`);
				}
				const reads = await memory.read(kind, query);
				state.memoryReads.push(...reads);
				state.provenance.memoryAccessed.push(kind);
				return reads;
			},
			getPreferences: (userId) => memory.getPreferences(userId),
		};
	}

	private normalizeResult<TOutput>(
		skill: SkillDefinition,
		raw: SkillResult<TOutput>,
		state: ExecutionState,
		startedAt: string,
		retryCount: number
	): SkillResult<TOutput> {
		const finishedAt = new Date().toISOString();
		return {
			...raw,
			warnings: [...state.warnings, ...raw.warnings],
			provenance: {
				...state.provenance,
				toolsUsed: unique([...state.provenance.toolsUsed, ...raw.usedTools]),
				connectorsUsed: unique([...state.provenance.connectorsUsed, ...raw.usedConnectors]),
				memoryAccessed: unique([
					...state.provenance.memoryAccessed,
					...raw.memoryReads.map((read) => read.kind),
					...raw.memoryWrites.map((write) => write.kind),
				]),
				finishedAt,
			},
			usedSkills: unique([skillKey(skill.id, skill.version), ...state.usedSkills, ...raw.usedSkills]),
			usedTools: unique([...state.usedTools, ...raw.usedTools]),
			usedConnectors: unique([...state.usedConnectors, ...raw.usedConnectors]),
			memoryReads: [...state.memoryReads, ...raw.memoryReads],
			memoryWrites: [...state.memoryWrites, ...raw.memoryWrites],
			startedAt,
			finishedAt,
			durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
			retryCount,
			metadata: raw.metadata,
		};
	}
}
