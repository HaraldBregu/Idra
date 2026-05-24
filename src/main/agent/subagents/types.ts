import type { AgentSessionMetadata } from '../../store/types';

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

export interface SubagentRunTaskInput {
	runId: string;
	task: string;
	agentId: string;
	childSessionKey: string;
	requesterSessionKey: string;
	controllerSessionKey: string;
	providerId?: string;
	modelId?: string;
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
