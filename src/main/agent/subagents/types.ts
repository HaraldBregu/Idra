import type { AgentSessionMetadata } from '../../../shared/store';
import type { ModelReasoningEffort } from '../../../shared/agents/service';

export type SubagentOutcome = 'ok' | 'error' | 'timeout' | 'cancelled';
export type SubagentSpawnMode = 'run' | 'session';
export type SubagentCleanup = 'delete' | 'keep';

export interface SubagentRunRecord {
	runId: string;
	taskId?: string;
	childSessionKey: string;
	requesterSessionKey: string;
	controllerSessionKey: string;
	task: string;
	taskName?: string;
	label?: string;
	agentId: string;
	modelId?: string;
	providerId?: string;
	effort?: ModelReasoningEffort;
	cleanup: SubagentCleanup;
	spawnMode: SubagentSpawnMode;
	createdAt: number;
	startedAt?: number;
	endedAt?: number;
	outcome?: SubagentOutcome;
	error?: string;
	expectsCompletionMessage?: boolean;
	metadata?: AgentSessionMetadata;
}

export interface SessionsSpawnInput {
	task: string;
	taskName?: string;
	label?: string;
	agentId?: string;
	model?: string;
	runTimeoutSeconds?: number;
	mode?: SubagentSpawnMode;
	cleanup?: SubagentCleanup;
	context?: 'isolated' | 'fork';
	sandbox?: 'inherit' | 'require';
}

export interface SessionsSpawnResult {
	runId: string;
	taskId: string;
	childSessionKey: string;
	agentId: string;
	status: 'queued';
	taskName?: string;
	label?: string;
}

export type SubagentsControlAction = 'list' | 'cancel' | 'history';

export interface SubagentsControlInput {
	action: SubagentsControlAction;
	runId?: string;
}

export interface SubagentsControlResult {
	action: SubagentsControlAction;
	runs?: SubagentRunRecord[];
	run?: SubagentRunRecord;
}

export interface SubagentRunTaskInput {
	runId: string;
	task: string;
	agentId: string;
	childSessionKey: string;
	requesterSessionKey: string;
	controllerSessionKey: string;
	providerId?: string;
	modelId?: string;
	effort?: ModelReasoningEffort;
	runTimeoutSeconds?: number;
	toolsAllow?: string[];
	toolsDeny?: string[];
	sessionMetadata: AgentSessionMetadata;
}

export interface SubagentRunTaskResult {
	runId: string;
	childSessionKey: string;
	text: string;
}
