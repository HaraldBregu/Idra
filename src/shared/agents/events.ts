import type {
	AgentRunState,
	ModelReasoningEffort,
	ReasoningSummaryState,
} from './service';
import type {
	AgentCapabilityResolutionSummary,
	AgentToolCapabilitySummary,
} from './capabilities';
import type { AgentRunStopReason, AgentToolResultStatus } from './constants';

export type { AgentToolResultStatus } from './constants';

export type AgentRunStreamEvent =
	| { type: 'run_state'; state: AgentRunState; label?: string }
	| {
			type: 'model_selected';
			providerId: string;
			model: string;
			effort?: ModelReasoningEffort;
	  }
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
	  } & AgentToolCapabilitySummary)
	| {
			type: 'tool_call_args_delta';
			iteration: number;
			toolCallId: string;
			toolName: string;
			jsonDelta: string;
			argsText: string;
	  }
	| {
			type: 'tool_call_input';
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			argsText: string;
	  }
	| ({
			type: 'tool_call_result';
			iteration: number;
			toolCallId: string;
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
	  };

export type AgentResponseEvent = AgentRunStreamEvent & {
	agentId: string;
	runId: string;
};
