import { randomUUID } from 'node:crypto';
import { DEFAULT_AGENT_ID } from '../../constants';
import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import { loadExistingSession } from '../../session/store';
import type { AgentConfig, AgentSessionMetadata } from '../../store/types';
import type { StoreService } from '../../store';
import type { TaskManager } from '../../tasks';
import { buildAgentSessionKey } from '../routing';
import { SubagentRegistry } from './registry';
import { SUBAGENT_RUN_TASK_TYPE } from './task-handler';
import type {
	SessionsSpawnResult,
	SubagentsControlInput,
	SubagentsControlResult,
	SubagentCleanup,
	SubagentRunRecord,
	SubagentRunTaskInput,
	SubagentSpawnMode,
} from './types';

export interface SubagentSpawnRequest {
	input: unknown;
	requesterAgentId?: string;
	requesterSessionKey: string;
	controllerSessionKey?: string;
	sessionBaseDir?: string;
}

export interface SubagentSpawnPort {
	spawn(request: SubagentSpawnRequest): Promise<SessionsSpawnResult>;
	control(request: SubagentsControlRequest): Promise<SubagentsControlResult>;
}

export interface SubagentsControlRequest {
	input: unknown;
	requesterSessionKey: string;
	sessionBaseDir?: string;
}

export interface SubagentSpawnServiceDependencies {
	store: Pick<StoreService, 'getAgentConfig'>;
	taskManager: Pick<TaskManager, 'run' | 'cancel'>;
	registry: SubagentRegistry;
	eventBus?: EventBus;
	logger?: Pick<LoggerService, 'info' | 'warn' | 'error'>;
	idFactory?: () => string;
	now?: () => number;
	loadParentMetadata?: (
		sessionKey: string,
		baseDir?: string
	) => Promise<AgentSessionMetadata | undefined>;
}

const DEFAULT_MAX_SPAWN_DEPTH = 1;
const DEFAULT_MAX_CHILDREN_PER_AGENT = 4;
const MAX_TASK_LENGTH = 200_000;

type ParsedSessionsSpawnInput = {
	task: string;
	taskName?: string;
	label?: string;
	agentId?: string;
	model?: string;
	runTimeoutSeconds?: number;
	mode: SubagentSpawnMode;
	cleanup: SubagentCleanup;
	context: 'isolated' | 'fork';
	sandbox: 'inherit' | 'require';
};

function requireTask(value: unknown): string {
	if (typeof value !== 'string') throw new Error('task is required.');
	const task = value.trim();
	if (!task) throw new Error('task is required.');
	if (task.length > MAX_TASK_LENGTH) throw new Error('task is too long.');
	return task;
}

function readRecord(value: unknown, name: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name} must be an object.`);
	}
	return value as Record<string, unknown>;
}

function optionalString(value: unknown, name: string): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
	return value.trim() || undefined;
}

function optionalPositiveInteger(value: unknown, name: string): number | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer.`);
	}
	return value;
}

function readSpawnMode(value: unknown): SubagentSpawnMode {
	if (value === undefined || value === null) return 'run';
	if (value === 'run' || value === 'session') return value;
	throw new Error('mode must be run or session.');
}

function readCleanup(value: unknown): SubagentCleanup {
	if (value === undefined || value === null) return 'keep';
	if (value === 'delete' || value === 'keep') return value;
	throw new Error('cleanup must be delete or keep.');
}

function readContext(value: unknown): 'isolated' | 'fork' {
	if (value === undefined || value === null) return 'isolated';
	if (value === 'isolated' || value === 'fork') return value;
	throw new Error('context must be isolated or fork.');
}

function readSandbox(value: unknown): 'inherit' | 'require' {
	if (value === undefined || value === null) return 'inherit';
	if (value === 'inherit' || value === 'require') return value;
	throw new Error('sandbox must be inherit or require.');
}

function parseInput(input: unknown): ParsedSessionsSpawnInput {
	const record = readRecord(input, 'sessions_spawn input');
	return {
		task: requireTask(record.task),
		taskName: optionalString(record.taskName, 'taskName'),
		label: optionalString(record.label, 'label'),
		agentId: optionalString(record.agentId, 'agentId'),
		model: optionalString(record.model, 'model'),
		runTimeoutSeconds: optionalPositiveInteger(record.runTimeoutSeconds, 'runTimeoutSeconds'),
		mode: readSpawnMode(record.mode),
		cleanup: readCleanup(record.cleanup),
		context: readContext(record.context),
		sandbox: readSandbox(record.sandbox),
	};
}

function parseModelOverride(value: string | undefined): { providerId?: string; modelId?: string } {
	if (!value) return {};
	const separator = value.includes('/') ? '/' : value.includes(':') ? ':' : undefined;
	if (!separator) return { modelId: value };
	const [providerId, ...modelParts] = value.split(separator);
	const modelId = modelParts.join(separator).trim();
	return {
		...(providerId.trim() ? { providerId: providerId.trim().toLowerCase() } : {}),
		...(modelId ? { modelId } : {}),
	};
}

function resolveChildModel(input: {
	override: { providerId?: string; modelId?: string };
	parentAgent?: AgentConfig;
	targetAgent?: AgentConfig;
}): {
	providerId?: string;
	modelId?: string;
	effort?: NonNullable<AgentConfig['model']>['effort'];
} {
	const subagentDefault = input.parentAgent?.subagents?.model;
	const targetDefault = input.targetAgent?.model;
	const hasOverride = Boolean(input.override.providerId || input.override.modelId);
	return {
		providerId:
			input.override.providerId ?? subagentDefault?.providerId ?? targetDefault?.providerId,
		modelId: input.override.modelId ?? subagentDefault?.modelId ?? targetDefault?.modelId,
		...(hasOverride ? {} : { effort: subagentDefault?.effort ?? targetDefault?.effort }),
	};
}

function parseControlInput(input: unknown): SubagentsControlInput {
	const record = readRecord(input, 'subagents input');
	if (record.action !== 'list' && record.action !== 'cancel' && record.action !== 'history') {
		throw new Error('subagents action must be list, cancel, or history.');
	}
	const runId = optionalString(record.runId, 'runId');
	if ((record.action === 'cancel' || record.action === 'history') && !runId) {
		throw new Error('runId is required.');
	}
	return { action: record.action, ...(runId ? { runId } : {}) };
}

function isRestrictedAgent(agent: AgentConfig | undefined): boolean {
	const tools = agent?.tools;
	return Boolean(
		tools?.allow ||
		tools?.deny?.length ||
		tools?.fs?.workspaceOnly ||
		tools?.fs?.readOnly ||
		tools?.fs?.writeWorkspaceOnly
	);
}

function uniqueList(values: Array<string | undefined>): string[] | undefined {
	const list = [...new Set(values.flatMap((value) => (value?.trim() ? [value.trim()] : [])))];
	return list.length > 0 ? list : undefined;
}

async function loadSessionMetadata(
	sessionKey: string,
	baseDir?: string
): Promise<AgentSessionMetadata | undefined> {
	const session = await loadExistingSession(sessionKey, { baseDir });
	return session?.agentMetadata;
}

export class SubagentSpawnService implements SubagentSpawnPort {
	private readonly idFactory: () => string;
	private readonly now: () => number;
	private readonly loadParentMetadata: NonNullable<
		SubagentSpawnServiceDependencies['loadParentMetadata']
	>;

	constructor(private readonly dependencies: SubagentSpawnServiceDependencies) {
		this.idFactory = dependencies.idFactory ?? randomUUID;
		this.now = dependencies.now ?? Date.now;
		this.loadParentMetadata = dependencies.loadParentMetadata ?? loadSessionMetadata;
	}

	async spawn(request: SubagentSpawnRequest): Promise<SessionsSpawnResult> {
		const input = parseInput(request.input);
		if (input.mode === 'session') {
			throw new Error('sessions_spawn mode "session" is not supported yet.');
		}
		if (input.context === 'fork') {
			throw new Error('sessions_spawn context "fork" is not supported yet.');
		}

		const requesterAgentId = request.requesterAgentId?.trim() || DEFAULT_AGENT_ID;
		const requesterSessionKey = request.requesterSessionKey.trim();
		if (!requesterSessionKey) throw new Error('requesterSessionKey is required.');
		const controllerSessionKey = request.controllerSessionKey?.trim() || requesterSessionKey;
		const parentAgent = this.dependencies.store.getAgentConfig(requesterAgentId);
		const targetAgentId = input.agentId || requesterAgentId;
		const targetAgent = this.dependencies.store.getAgentConfig(targetAgentId);

		this.assertTargetAllowed({
			requesterAgentId,
			targetAgentId,
			parentAgent,
			targetAgent,
			explicitAgentId: Boolean(input.agentId),
			sandbox: input.sandbox,
		});

		const parentMetadata = await this.loadParentMetadata(
			requesterSessionKey,
			request.sessionBaseDir
		);
		const parentDepth = parentMetadata?.spawnDepth ?? 0;
		const maxDepth = parentAgent?.subagents?.maxSpawnDepth ?? DEFAULT_MAX_SPAWN_DEPTH;
		if (parentDepth >= maxDepth) {
			throw new Error(`Maximum subagent spawn depth reached: ${maxDepth}`);
		}

		const maxChildren =
			parentAgent?.subagents?.maxChildrenPerAgent ?? DEFAULT_MAX_CHILDREN_PER_AGENT;
		const activeChildren =
			this.dependencies.registry.countActiveRunsForSession(requesterSessionKey);
		if (activeChildren >= maxChildren) {
			throw new Error(`Maximum active subagent children reached: ${maxChildren}`);
		}

		const runId = this.idFactory();
		const taskId = `subagent:${runId}`;
		const childSessionKey = buildAgentSessionKey({
			agentId: targetAgentId,
			kind: 'subagent',
			id: runId,
		});
		const childModel = resolveChildModel({
			override: parseModelOverride(input.model),
			parentAgent,
			targetAgent,
		});
		const spawnDepth = parentDepth + 1;
		const subagentRole = spawnDepth >= maxDepth ? 'leaf' : 'orchestrator';
		const subagentControlScope = spawnDepth >= maxDepth ? 'none' : 'children';
		const inheritedToolDeny = uniqueList([
			...(parentMetadata?.inheritedToolDeny ?? []),
			...(parentAgent?.tools?.deny ?? []),
			...(subagentControlScope === 'none' ? ['sessions_spawn', 'subagents'] : []),
		]);
		const inheritedToolAllow = parentMetadata?.inheritedToolAllow;
		const sessionMetadata: AgentSessionMetadata = {
			agentId: targetAgentId,
			spawnedBy: requesterSessionKey,
			spawnDepth,
			subagentRole,
			subagentControlScope,
			spawnedWorkspace: targetAgent?.workspace ?? parentAgent?.workspace,
			...(inheritedToolAllow ? { inheritedToolAllow } : {}),
			...(inheritedToolDeny ? { inheritedToolDeny } : {}),
		};
		const record: SubagentRunRecord = {
			runId,
			taskId,
			childSessionKey,
			requesterSessionKey,
			controllerSessionKey,
			task: input.task,
			taskName: input.taskName,
			label: input.label,
			agentId: targetAgentId,
			modelId: childModel.modelId,
			providerId: childModel.providerId,
			effort: childModel.effort,
			cleanup: input.cleanup,
			spawnMode: input.mode,
			createdAt: this.now(),
			expectsCompletionMessage: false,
			metadata: sessionMetadata,
		};
		this.dependencies.registry.registerSubagentRun(record);

		const taskInput: SubagentRunTaskInput = {
			runId,
			task: input.task,
			agentId: targetAgentId,
			childSessionKey,
			requesterSessionKey,
			controllerSessionKey,
			providerId: childModel.providerId,
			modelId: childModel.modelId,
			effort: childModel.effort,
			runTimeoutSeconds: input.runTimeoutSeconds ?? parentAgent?.subagents?.runTimeoutSeconds,
			toolsAllow: inheritedToolAllow,
			toolsDeny: inheritedToolDeny,
			sessionMetadata,
		};
		this.dependencies.taskManager.run({
			id: taskId,
			type: SUBAGENT_RUN_TASK_TYPE,
			title: input.taskName ?? input.label ?? 'Subagent run',
			input: taskInput,
			metadata: {
				subagentRunId: runId,
				childSessionKey,
				requesterSessionKey,
				agentId: targetAgentId,
			},
		});
		this.dependencies.eventBus?.emit('subagent:created', record);
		this.dependencies.logger?.info?.('SubagentSpawnService', `Spawned subagent ${runId}`);

		return {
			runId,
			taskId,
			childSessionKey,
			agentId: targetAgentId,
			status: 'queued',
			taskName: input.taskName,
			label: input.label,
		};
	}

	async control(request: SubagentsControlRequest): Promise<SubagentsControlResult> {
		const input = parseControlInput(request.input);
		const requesterSessionKey = request.requesterSessionKey.trim();
		if (!requesterSessionKey) throw new Error('requesterSessionKey is required.');
		const requesterMetadata = await this.loadParentMetadata(
			requesterSessionKey,
			request.sessionBaseDir
		);
		if (requesterMetadata?.subagentControlScope === 'none') {
			throw new Error('This subagent cannot control child runs.');
		}

		if (input.action === 'list') {
			return {
				action: 'list',
				runs: this.dependencies.registry.listSubagentRunsForRequester(requesterSessionKey),
			};
		}

		const record = this.requireControlledRun(requesterSessionKey, input.runId!);
		if (input.action === 'history') {
			return { action: 'history', run: record };
		}
		if (record.outcome) {
			return { action: 'cancel', run: record };
		}

		if (record.taskId) {
			try {
				this.dependencies.taskManager.cancel(record.taskId);
			} catch (error) {
				this.dependencies.logger?.warn?.('SubagentSpawnService', 'Subagent task cancel failed', {
					runId: record.runId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		const cancelled = this.dependencies.registry.cancelSubagentRun(record.runId);
		this.dependencies.eventBus?.emit('subagent:completed', cancelled);
		return { action: 'cancel', run: cancelled };
	}

	private requireControlledRun(requesterSessionKey: string, runId: string): SubagentRunRecord {
		const record = this.dependencies.registry.getSubagentRun(runId);
		if (!record || record.requesterSessionKey !== requesterSessionKey) {
			throw new Error(`Subagent run not found: ${runId}`);
		}
		return record;
	}

	private assertTargetAllowed(input: {
		requesterAgentId: string;
		targetAgentId: string;
		parentAgent?: AgentConfig;
		targetAgent?: AgentConfig;
		explicitAgentId: boolean;
		sandbox?: 'inherit' | 'require';
	}): void {
		const sameAgent = input.requesterAgentId === input.targetAgentId;
		if (input.parentAgent?.subagents?.requireAgentId && !input.explicitAgentId) {
			throw new Error('sessions_spawn requires an explicit agentId for this agent.');
		}
		if (!sameAgent) {
			if (!input.targetAgent) throw new Error(`Agent not configured: ${input.targetAgentId}`);
			const allowAgents = input.parentAgent?.subagents?.allowAgents ?? [];
			if (!allowAgents.includes('*') && !allowAgents.includes(input.targetAgentId)) {
				throw new Error(`Cross-agent spawn is not allowed: ${input.targetAgentId}`);
			}
		}
		if (
			isRestrictedAgent(input.parentAgent) &&
			!isRestrictedAgent(input.targetAgent) &&
			!sameAgent
		) {
			throw new Error('Restricted agents cannot spawn less-restricted children.');
		}
		if (input.sandbox === 'require' && !isRestrictedAgent(input.targetAgent ?? input.parentAgent)) {
			throw new Error('sandbox "require" needs a restricted target agent.');
		}
	}
}
