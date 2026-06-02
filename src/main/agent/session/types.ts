import type { AgentSessionMetadata } from '../../../shared/store';
import type { TranscriptEntry } from '../../llm/LlmTypes';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export interface CompactionMarker {
	atTurn: number;
	droppedCount: number;
	summaryHash: string;
}

export type SessionStatus = 'active' | 'idle' | 'waiting' | 'completed' | 'failed' | 'cancelled';

export interface SessionFile {
	id: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider: string;
	sessionFile?: string;
	status?: SessionStatus;
	agentId?: string;
	agentMetadata?: AgentSessionMetadata;
	task?: string;
	parentSessionId?: string;
	spawnedBySessionId?: string;
	labels?: string[];
	modelOverride?: string;
	memoryFlushAt?: string;
	memoryFlushCompactionCount?: number;
	memoryFlushContextHash?: string;
	transcript: TranscriptEntry[];
	plan: PlanEntry[];
	compactionMarkers: CompactionMarker[];
}

export interface SessionIndexEntry {
	id: string;
	sessionFile: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider: string;
	status?: SessionStatus;
	agentId?: string;
	agentMetadata?: AgentSessionMetadata;
	task?: string;
	parentSessionId?: string;
	spawnedBySessionId?: string;
	labels?: string[];
	modelOverride?: string;
	memoryFlushAt?: string;
	memoryFlushCompactionCount?: number;
	memoryFlushContextHash?: string;
}

export interface SessionStoreOptions {
	baseDir?: string;
}
