import type { ProviderBuiltInToolSpec, ProviderAdapter, Usage } from '../../llm/types';
import type { AgentTool, AgentToolManagementOptions, ToolContext } from '../tooling';
import type { AgentToolControllerPort } from '../types';
import type { SessionFile } from '../session/store';
import type { ModelReasoningEffort } from '../../../shared/agents/service';
import type { AgentRunStreamEvent } from '../../../shared/agents/events';
import type { ProviderSpec } from '../../llm/router';

export type { AgentRunStreamEvent } from '../../../shared/agents/events';

export interface AgentProviderLookup {
	getAgentService():
		| {
				provider: { id: string };
				model: { id: string; name: string; effort?: ModelReasoningEffort };
		  }
		| undefined;
	getProviderById(id: string): { apiKey: string; baseUrl?: string } | undefined;
}

export interface AgentRunInput {
	runId: string;
	userMessage: string;
	systemPrompt: string;
	session: SessionFile;
	provider?: ProviderAdapter;
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
	tools: AgentTool[];
	builtInTools?: ProviderBuiltInToolSpec[];
	ctx: ToolContext;
	maxTokens?: number;
	maxIterations?: number;
	streamOutput?: (chunk: string) => void;
	streamEvent?: (event: AgentRunStreamEvent) => void;
	signal?: AbortSignal;
	toolManagement?: AgentToolManagementOptions;
	toolController?: AgentToolControllerPort;
	store?: AgentProviderLookup;
	providerFactory?: (spec: ProviderSpec) => ProviderAdapter;
	agentRuntimeId?: string;
}

export interface AgentRunResult {
	finalText: string;
	toolCalls: number;
	usage: Usage;
	stopReason: 'end_turn' | 'max_tokens' | 'max_iterations' | 'error' | 'cancelled';
	session: SessionFile;
}

export interface AgentExecutionServicePort {
	execute(input: AgentRunInput): Promise<AgentRunResult>;
}
