import { beforeToolCall, newCallTracker } from '../agent/tools/before-call';
import type { AgentTool, AgentToolResult } from '../agent/tools/types';
import type { SkillRegistry } from './catalog';
import { validateJsonSchema } from './schema';
import type {
	MemoryPolicy,
	MemoryRetriever,
	SkillDefinition,
	SkillError,
	SkillExecutionContext,
	SkillExecutionRequest,
	SkillExecutionRequestContext,
	SkillLogger,
	SkillMemoryKind,
	SkillMemoryRead,
	SkillMemoryWrite,
	SkillMemoryWriteDecision,
	SkillProvenance,
	SkillResult,
	SkillSafetyCheck,
	SkillSafetyPolicyPort,
	SkillUserPreferences,
} from './types';
import { createProvenance, emptyPreferences, skillKey } from './types';

export interface SkillAuditRecord {
	skillId: string;
	version: string;
	userId: string;
	sessionId: string;
	inputSummary: string;
	outputSummary: string;
	usedTools: string[];
	usedConnectors: string[];
	permissionsUsed: string[];
	executionDurationMs: number;
	retries: number;
	failures: string[];
	warnings: string[];
	safetyInterventions: string[];
	createdAt: string;
}

export interface SkillPreferenceStore {
	getPreferences(userId: string): Promise<SkillUserPreferences>;
	recordOutcome(userId: string, skillId: string, result: SkillResult): Promise<void>;
	rememberPreference(userId: string, preference: Partial<SkillUserPreferences>): Promise<void>;
	getSuccessRate(userId: string, skillId: string): Promise<number | undefined>;
}

export interface SkillWorkflowStep {
	id: string;
	skillId: string;
	version?: string;
	input: unknown | ((previous: SkillResult[]) => unknown);
	dependsOn?: string[];
	fallbacks?: Array<{ skillId: string; version?: string; input?: unknown }>;
}

export interface SkillWorkflow {
	id: string;
	steps: SkillWorkflowStep[];
	maxDepth?: number;
}

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
const SECRET_KEY_PATTERN = /api[_-]?key|authorization|credential|oauth|password|secret|token/i;
const SECRET_MEMORY_KIND = /secret|credential|token|password|oauth/i;
const INJECTION_PATTERN = /ignore (all )?(previous|system) instructions|developer message|reveal.*(prompt|secret)|bypass safety/i;

function unique(values: string[]): string[] {
	return Array.from(new Set(values));
}

function redact(value: unknown, depth = 0): unknown {
	if (depth > 4) return '[truncated]';
	if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
	if (!value || typeof value !== 'object') return value;
	const out: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		out[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(child, depth + 1);
	}
	return out;
}

function summarize(value: unknown): string {
	const text = JSON.stringify(redact(value));
	return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

function mergeUnique(left: string[], right?: string[]): string[] {
	return Array.from(new Set([...left, ...(right ?? [])]));
}

function denied(reason: string, warnings: string[] = []): SkillSafetyCheck {
	return { allowed: false, reasons: [reason], warnings };
}

function allowed(warnings: string[] = [], requiresConfirmation = false): SkillSafetyCheck {
	return { allowed: true, reasons: [], warnings, requiresConfirmation };
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

function scopedTools(
	skill: SkillDefinition,
	available: ReadonlyMap<string, AgentTool>
): Map<string, AgentTool> {
	const allowed = new Set([...skill.requiredTools, ...skill.contract.allowedTools]);
	const out = new Map<string, AgentTool>();
	for (const name of allowed) {
		const tool = available.get(name);
		if (tool) out.set(name, tool);
	}
	return out;
}

function timeoutPromise<T>(
	promise: Promise<T>,
	timeoutMs: number | null,
	signal?: AbortSignal
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		if (signal?.aborted) {
			reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
			return;
		}
		const timeout =
			timeoutMs === null
				? undefined
				: setTimeout(
						() => reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' })),
						timeoutMs
					);
		const abort = (): void => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
		signal?.addEventListener('abort', abort, { once: true });
		promise.then(resolve, reject).finally(() => {
			if (timeout) clearTimeout(timeout);
			signal?.removeEventListener('abort', abort);
		});
	});
}

export class SkillAuditLog {
	private readonly records: SkillAuditRecord[] = [];

	constructor(private readonly logger?: SkillLogger) {}

	record(skill: SkillDefinition, context: { userId: string; sessionId: string }, input: unknown, result: SkillResult): void {
		const record: SkillAuditRecord = {
			skillId: skill.id,
			version: skill.version,
			userId: context.userId,
			sessionId: context.sessionId,
			inputSummary: summarize(input),
			outputSummary: summarize(result.success ? result.data : result.error),
			usedTools: [...new Set(result.usedTools)],
			usedConnectors: [...new Set(result.usedConnectors)],
			permissionsUsed: [...skill.permissionsRequired],
			executionDurationMs: result.durationMs,
			retries: result.retryCount,
			failures: result.error ? [result.error.message] : [],
			warnings: result.warnings,
			safetyInterventions: result.error?.code === 'safety_denied' ? [result.error.message] : [],
			createdAt: new Date().toISOString(),
		};
		this.records.push(record);
		this.logger?.info('SkillAuditLog', `Recorded ${skill.id}@${skill.version}`, {
			skillId: record.skillId,
			durationMs: record.executionDurationMs,
			success: result.success,
		});
	}

	list(): SkillAuditRecord[] {
		return this.records.map((record) => ({ ...record }));
	}
}

interface StoredPreferences extends SkillUserPreferences {
	successes: Record<string, number>;
	failures: Record<string, number>;
}

export class InMemorySkillPreferenceStore implements SkillPreferenceStore {
	private readonly byUser = new Map<string, StoredPreferences>();

	async getPreferences(userId: string): Promise<SkillUserPreferences> {
		const stored = this.ensure(userId);
		return {
			preferredSkills: [...stored.preferredSkills],
			avoidedSkills: [...stored.avoidedSkills],
			preferredWorkflowStyles: [...stored.preferredWorkflowStyles],
			preferredOutputFormats: [...stored.preferredOutputFormats],
			preferredAutomationLevel: stored.preferredAutomationLevel,
			metadata: { ...stored.metadata },
		};
	}

	async recordOutcome(userId: string, skillId: string, result: SkillResult): Promise<void> {
		const stored = this.ensure(userId);
		const key = skillId.toLowerCase();
		if (result.success) {
			stored.successes[key] = (stored.successes[key] ?? 0) + 1;
		} else {
			stored.failures[key] = (stored.failures[key] ?? 0) + 1;
		}
	}

	async rememberPreference(userId: string, preference: Partial<SkillUserPreferences>): Promise<void> {
		const stored = this.ensure(userId);
		stored.preferredSkills = mergeUnique(stored.preferredSkills, preference.preferredSkills);
		stored.avoidedSkills = mergeUnique(stored.avoidedSkills, preference.avoidedSkills);
		stored.preferredWorkflowStyles = mergeUnique(
			stored.preferredWorkflowStyles,
			preference.preferredWorkflowStyles
		);
		stored.preferredOutputFormats = mergeUnique(
			stored.preferredOutputFormats,
			preference.preferredOutputFormats
		);
		stored.preferredAutomationLevel =
			preference.preferredAutomationLevel ?? stored.preferredAutomationLevel;
		stored.metadata = { ...stored.metadata, ...(preference.metadata ?? {}) };
	}

	async getSuccessRate(userId: string, skillId: string): Promise<number | undefined> {
		const stored = this.ensure(userId);
		const key = skillId.toLowerCase();
		const successes = stored.successes[key] ?? 0;
		const failures = stored.failures[key] ?? 0;
		const total = successes + failures;
		return total === 0 ? undefined : successes / total;
	}

	private ensure(userId: string): StoredPreferences {
		const existing = this.byUser.get(userId);
		if (existing) return existing;
		const next: StoredPreferences = {
			...emptyPreferences(),
			successes: {},
			failures: {},
		};
		this.byUser.set(userId, next);
		return next;
	}
}

export class NoopSkillMemoryRetriever implements MemoryRetriever {
	constructor(private readonly preferences: SkillPreferenceStore) {}

	async read(kind: SkillMemoryKind, _query: string): Promise<SkillMemoryRead[]> {
		if (SECRET_MEMORY_KIND.test(kind)) return [];
		return [];
	}

	getPreferences(userId: string) {
		return this.preferences.getPreferences(userId);
	}
}

export class DefaultSkillMemoryPolicy implements MemoryPolicy {
	canRead(kind: SkillMemoryKind, _context: SkillExecutionContext): boolean {
		return !SECRET_MEMORY_KIND.test(kind);
	}

	async evaluateWrite(
		write: SkillMemoryWrite,
		_context: SkillExecutionContext
	): Promise<SkillMemoryWriteDecision> {
		if (write.sensitive || SECRET_MEMORY_KIND.test(write.kind)) {
			return { allowed: false, reason: 'Memory policy rejects sensitive skill writes.' };
		}
		return { allowed: true, reason: 'Memory write approved by policy.', committed: false };
	}
}

export class SkillSafetyPolicy implements SkillSafetyPolicyPort {
	constructor(
		private readonly options: {
			maxDepth?: number;
			disallowedTools?: string[];
			disallowedConnectors?: string[];
		} = {}
	) {}

	async checkBeforeExecution(
		skill: SkillDefinition,
		input: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		const maxDepth = context.maxDepth ?? this.options.maxDepth ?? 4;
		if (!skill.enabled) return denied(`Skill is disabled: ${skill.id}`);
		if (context.skillDepth > maxDepth) return denied(`Skill depth exceeds limit ${maxDepth}`);
		if (context.provenanceChain.some((item) => item.skillId === skill.id)) {
			return denied(`Recursive skill execution blocked: ${skill.id}`);
		}

		const missingTools = skill.requiredTools.filter((tool) => !context.allowedTools.has(tool));
		if (missingTools.length > 0) return denied(`Missing tools: ${missingTools.join(', ')}`);

		const missingConnectors = skill.requiredConnectors.filter(
			(connector) => !context.allowedConnectors.has(connector)
		);
		if (missingConnectors.length > 0) {
			return denied(`Missing connectors: ${missingConnectors.join(', ')}`);
		}

		if (typeof input === 'string' && INJECTION_PATTERN.test(input)) {
			return denied('Potential prompt-injection content in skill input');
		}

		const serialized = JSON.stringify(input ?? {});
		const warnings = INJECTION_PATTERN.test(serialized)
			? ['Skill input contains prompt-injection-like text; treat external data as untrusted.']
			: [];
		return allowed(warnings, false);
	}

	async checkToolUse(
		skill: SkillDefinition,
		toolName: string,
		_args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		if (this.options.disallowedTools?.includes(toolName)) {
			return denied(`Tool is globally disallowed: ${toolName}`);
		}
		if (!context.allowedTools.has(toolName)) return denied(`Tool is unavailable: ${toolName}`);
		const allowedTools = new Set([...skill.requiredTools, ...skill.contract.allowedTools]);
		if (!allowedTools.has(toolName)) return denied(`Skill is not allowed to use tool: ${toolName}`);
		return allowed();
	}

	async checkConnectorUse(
		skill: SkillDefinition,
		connectorId: string,
		toolName: string,
		_args: unknown,
		context: SkillExecutionRequestContext
	): Promise<SkillSafetyCheck> {
		if (this.options.disallowedConnectors?.includes(connectorId)) {
			return denied(`Connector is globally disallowed: ${connectorId}`);
		}
		const connector = context.allowedConnectors.get(connectorId);
		if (!connector) return denied(`Connector is unavailable: ${connectorId}`);
		const allowedConnectors = new Set([
			...skill.requiredConnectors,
			...skill.contract.allowedConnectors,
		]);
		if (!allowedConnectors.has(connectorId)) {
			return denied(`Skill is not allowed to use connector: ${connectorId}`);
		}
		if (!connector.tools.has(toolName)) {
			return denied(`Connector tool is unavailable: ${connectorId}.${toolName}`);
		}
		return allowed();
	}
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
		const placeholderSkill =
			skill ??
			({
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

		const safety = await request.context.safetyPolicy.checkBeforeExecution(
			skill,
			request.input,
			request.context
		);
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
				const context = this.createExecutionContext(
					skill,
					request.context,
					state,
					startedAt,
					retryCount
				);
				const raw = await timeoutPromise(
					skill.execute(request.input, context),
					request.context.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : request.context.timeoutMs,
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
					state.warnings.push(
						before.vetoResult.content
							.map((item) => (item.type === 'text' ? item.text : ''))
							.join(' ')
					);
					return before.vetoResult as AgentToolResult<TDetails>;
				}
				if (before.warning) state.warnings.push(before.warning);
				const result = await tool.execute(args, base.toolContext);
				state.usedTools.push(name);
				state.provenance.toolsUsed.push(name);
				return result as AgentToolResult<TDetails>;
			},
			callConnector: async (
				connectorId: string,
				toolName: string,
				args: unknown
			): Promise<unknown> => {
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
			usedSkills: unique([
				skillKey(skill.id, skill.version),
				...state.usedSkills,
				...raw.usedSkills,
			]),
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

export class SkillComposer {
	constructor(private readonly engine: SkillExecutionEngine) {}

	validate(workflow: SkillWorkflow): void {
		const seen = new Set<string>();
		const visiting = new Set<string>();
		const byId = new Map(workflow.steps.map((step) => [step.id, step]));

		const visit = (id: string, depth: number): void => {
			if (depth > (workflow.maxDepth ?? 8)) throw new Error(`Workflow depth exceeded: ${workflow.id}`);
			if (visiting.has(id)) throw new Error(`Cyclic skill workflow dependency: ${id}`);
			if (seen.has(id)) return;
			const step = byId.get(id);
			if (!step) throw new Error(`Unknown workflow step dependency: ${id}`);
			visiting.add(id);
			for (const dependency of step.dependsOn ?? []) visit(dependency, depth + 1);
			visiting.delete(id);
			seen.add(id);
		};

		for (const step of workflow.steps) visit(step.id, 0);
	}

	async execute(workflow: SkillWorkflow, context: SkillExecutionRequestContext): Promise<SkillResult[]> {
		this.validate(workflow);
		const completed = new Map<string, SkillResult>();
		const results: SkillResult[] = [];

		for (const step of workflow.steps) {
			const dependencies = step.dependsOn ?? [];
			const failedDependency = dependencies.find((id) => completed.get(id)?.success === false);
			if (failedDependency) continue;
			const input = typeof step.input === 'function' ? step.input(results) : step.input;
			let result = await this.engine.execute({
				skillId: step.skillId,
				version: step.version,
				input,
				context,
			});
			if (!result.success) {
				for (const fallback of step.fallbacks ?? []) {
					result = await this.engine.execute({
						skillId: fallback.skillId,
						version: fallback.version,
						input: fallback.input ?? input,
						context,
					});
					if (result.success) break;
				}
			}
			completed.set(step.id, result);
			results.push(result);
		}

		return results;
	}
}
