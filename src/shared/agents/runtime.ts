import type { ModelReasoningEffort } from './reasoning';

export interface AgentSendRuntimeOptions {
	readonly runId?: string;
	readonly sessionId?: string;
	/** @deprecated Use sessionId. */
	readonly agentRuntime?: string;
	readonly providerId?: string;
	readonly model?: string;
	readonly effort?: ModelReasoningEffort;
	readonly lightContext?: boolean;
	readonly toolsAllow?: readonly string[];
	readonly toolsDeny?: readonly string[];
}

export type AgentRunState =
	| 'idle'
	| 'thinking'
	| 'reasoning'
	| 'using_tools'
	| 'answering'
	| 'completed'
	| 'cancelled'
	| 'error';

export type ReasoningSummaryState = 'pending' | 'running' | 'completed' | 'error';
