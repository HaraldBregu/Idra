import type { MemoryManager } from '../../memory/manager';
import type { TranscriptEntry } from '../../llm/types';
import type { CompactionMarker } from '../session/store';
import type { BootstrapMode, WorkspaceContextFile } from '../workspace';

export interface AgentCompactionOptions {
	runId?: string;
	agentId?: string;
	sessionKey?: string;
	providerId?: string;
	requestedRuntime?: string;
	storedRuntime?: string;
	channelId?: string;
}

export type NativeCompactionResult = {
	transcript: TranscriptEntry[];
	marker: CompactionMarker | null;
};

export interface SystemPromptCtx {
	workspace: string;
	date: string;
	model: string;
	memory?: MemoryManager;
	startupFiles?: WorkspaceContextFile[];
	bootstrapMode?: BootstrapMode;
	heartbeat?: {
		includeSection: boolean;
	};
}
