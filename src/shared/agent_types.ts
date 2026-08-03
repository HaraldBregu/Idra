export type ModelReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

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

export type AgentRunStopReason =
	| 'end_turn'
	| 'max_tokens'
	| 'max_iterations'
	| 'max_tool_calls'
	| 'timeout'
	| 'error'
	| 'cancelled';

export type AgentToolResultStatus = 'ok' | 'error' | 'blocked' | 'rejected';

export type AgentToolPermissionDecision = 'approve' | 'reject' | 'approve_always';

export type AgentPermissionMode = 'ask' | 'bypass';

export interface AgentInputFile {
	name: string;
	mimeType: string;
	data: string;
}

export interface AgentTokenUsage {
	inputTokens?: number;
	outputTokens?: number;
}

export type AgentHistoryContentBlock =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'tool_use';
			toolUseId: string;
			toolName: string;
			toolArgs?: unknown;
	  };

export interface AgentHistoryMessage {
	role: 'user' | 'agent' | 'assistant' | 'tool';
	content?: string | null;
	blocks?: AgentHistoryContentBlock[];
	contentBlocks?: AgentHistoryContentBlock[];
	toolUseId?: string;
	isError?: boolean;
	status?: AgentToolResultStatus;
	output?: unknown;
	usage?: AgentTokenUsage;
}

export interface AgentSessionSummary {
	id: string;
	createdAtMs: number;
	title: string;
}

export type AgentCapabilityServiceKind = 'tool' | 'connector' | 'mcp';

export interface AgentToolCapabilitySummary {
	name: string;
	displayName?: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
}

export interface AgentSelectedSkillSummary {
	name: string;
	reason: string;
}

export type AgentIntentResolutionStatus = 'recognized' | 'ambiguous' | 'missing_slots' | 'unknown';

export interface AgentIntentAlternativeSummary {
	name: string;
	confidence?: number;
	reason?: string;
}

export interface AgentIntentSlotSummary {
	name: string;
	value?: unknown;
	missing?: boolean;
	reason?: string;
}

export interface AgentIntentResolutionSummary {
	name: string;
	status: AgentIntentResolutionStatus;
	confidence?: number;
	reason?: string;
	alternatives?: AgentIntentAlternativeSummary[];
	slots?: AgentIntentSlotSummary[];
}

export type AgentCapabilityDecisionMode =
	| 'direct_answer'
	| 'use_tools'
	| 'use_skills'
	| 'use_tools_and_skills';

export interface AgentCapabilityDecisionSummary {
	mode: AgentCapabilityDecisionMode;
	reason: string;
}

export interface AgentCapabilityServiceSummary {
	name: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
	displayName?: string;
}

export interface AgentRouteResolutionSummary {
	target: AgentCapabilityDecisionMode;
	reason: string;
	serviceKinds?: AgentCapabilityServiceKind[];
	requiredApprovals?: string[];
}

export interface AgentCapabilityResolutionSummary {
	tools: string[];
	services?: AgentCapabilityServiceSummary[];
	skills: AgentSelectedSkillSummary[];
	directAnswer: boolean;
	decision: AgentCapabilityDecisionSummary;
	intent?: AgentIntentResolutionSummary;
	route?: AgentRouteResolutionSummary;
}

export type AgentRunStreamEvent =
	| { type: 'run_state'; state: AgentRunState; label?: string }
	| {
			type: 'model_selected';
			model: string;
			effort?: ModelReasoningEffort;
	  }
	| { type: 'model_usage'; usage?: AgentTokenUsage }
	| { type: 'capability_resolution_start' }
	| ({ type: 'capability_resolution_result' } & AgentCapabilityResolutionSummary)
	| {
			type: 'reasoning_summary';
			id: string;
			title: string;
			summary: string;
			state: ReasoningSummaryState;
	  }
	| { type: 'text_delta'; delta: string }
	| ({
			type: 'tool_call_start';
			iteration: number;
			toolCallId: string;
			toolName: string;
	  } & AgentToolCapabilitySummary)
	| ({
			type: 'tool_call_args_delta';
			iteration: number;
			toolCallId: string;
			toolName: string;
			jsonDelta: string;
			argsText: string;
	  } & Partial<AgentToolCapabilitySummary>)
	| ({
			type: 'tool_call_input';
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			argsText: string;
	  } & Partial<AgentToolCapabilitySummary>)
	| {
			type: 'tool_permission_request';
			toolCallId: string;
			toolName: string;
			input: unknown;
			mode: 'ask';
			detail?: string;
	  }
	| ({
			type: 'tool_call_result';
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			output: unknown;
			outputText: string;
			status: AgentToolResultStatus;
			durationMs: number;
			errorText?: string;
	  } & AgentToolCapabilitySummary)
	| {
			type: 'run_finished';
			stopReason: AgentRunStopReason;
			outputChars: number;
			usage?: AgentTokenUsage;
	  };

export type AgentResponseEvent = AgentRunStreamEvent & {
	agentId: string;
	runId: string;
};
