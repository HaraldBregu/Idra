import type { ProviderAdapter } from '../../provider/types';
import type { AgentRunHooks, AgentRunStreamEvent } from '../run';
import type { AgentTool, ToolContext } from '../../tools/types';
import type { SessionFile } from '../../session/store';
import type { ModelReasoningEffort } from '../../../shared/agents/service';
import type { AgentToolManagementOptions } from '../../tools/management';

export type AgentHarnessSupportContext = {
	provider: string;
	modelId?: string;
	requestedRuntime: string;
};

export type AgentHarnessSupport =
	| { supported: true; priority?: number; reason?: string }
	| { supported: false; reason?: string };

export interface AgentHarnessAttemptParams {
	runId: string;
	provider: string;
	model: string;
	requestedRuntime?: string;
	storedRuntime?: string;
	userMessage: string;
	systemPrompt: string;
	session: SessionFile;
	effort?: ModelReasoningEffort;
	tools: AgentTool[];
	ctx: ToolContext;
	providerAdapter: ProviderAdapter;
	maxTokens?: number;
	maxIterations?: number;
	streamOutput?: (chunk: string) => void;
	streamEvent?: (event: AgentRunStreamEvent) => void;
	hooks?: AgentRunHooks;
	signal?: AbortSignal;
	toolManagement?: AgentToolManagementOptions;
}

export type AgentHarnessAttemptResult = import('../run').AgentRunResult & {
	agentHarnessId?: string;
	agentHarnessResultClassification?: string;
};

export interface AgentHarnessSideQuestionParams {
	question: string;
}

export interface AgentHarnessSideQuestionResult {
	text: string;
}

export type AgentHarnessCompactParams = Record<string, unknown>;
export type AgentHarnessCompactResult = Record<string, unknown> | undefined;

export interface AgentHarnessResetParams {
	sessionId?: string;
	sessionKey?: string;
	// reserved for future use
	sessionFile?: string;
	reason?: 'new' | 'reset' | 'idle' | 'daily' | 'compaction' | 'deleted' | 'unknown';
}

export type AgentHarnessResultClassification = string | undefined;

export interface AgentHarness {
	id: string;
	label: string;
	pluginId?: string;
	deliveryDefaults?: {
		sourceVisibleReplies?: 'automatic' | 'message_tool';
	};
	supports(context: AgentHarnessSupportContext): AgentHarnessSupport;
	runAttempt(params: AgentHarnessAttemptParams): Promise<AgentHarnessAttemptResult>;
	runSideQuestion?(params: AgentHarnessSideQuestionParams): Promise<AgentHarnessSideQuestionResult>;
	classify?(result: AgentHarnessAttemptResult, ctx: AgentHarnessAttemptParams): AgentHarnessResultClassification;
	compact?(params: AgentHarnessCompactParams): Promise<AgentHarnessCompactResult | undefined>;
	reset?(params: AgentHarnessResetParams): Promise<void> | void;
	dispose?(): Promise<void> | void;
}

export interface RegisteredAgentHarness {
	harness: AgentHarness;
	ownerPluginId?: string;
}
