import type { ModelReasoningEffort } from '../../../shared/agents/service';

export type SubagentOutcome = 'ok' | 'error' | 'timeout' | 'cancelled';
export type SubagentSpawnMode = 'run' | 'session';
export type SubagentCleanup = 'delete' | 'keep';
export interface SubagentRunRecord {
	runId: string;
	requesterSessionKey: string;
	childSessionKey: string;
	agentId: string;
	task: string;
	status: 'queued' | 'running' | 'completed';
	cleanup: SubagentCleanup;
	spawnMode: SubagentSpawnMode;
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
	outcome?: SubagentOutcome;
	error?: string;
}
export interface SessionsSpawnResult {
	run: SubagentRunRecord;
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
	requesterSessionKey: string;
	childSessionKey: string;
	agentId: string;
	task: string;
	providerId?: string;
	modelId?: string;
	effort?: ModelReasoningEffort;
	timeoutMs?: number;
}
export interface SubagentRunTaskResult {
	text: string;
	run: SubagentRunRecord;
}
