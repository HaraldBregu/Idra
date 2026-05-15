import { Provider } from "./providers";

export interface Service {
	assistant?: Assistant;
	imageGeneration?: Assistant;
	rag: string;
	ocr: string;
}

export interface Model {
	id: string;
	name: string;
}

export interface Assistant {
	provider: Omit<Provider, "apiKey">;
	model: Model;
}

export type ApprovalDecision = 'allow-once' | 'allow-always' | 'deny';

export type AssistantRunState =
	| 'idle'
	| 'thinking'
	| 'reasoning'
	| 'using_tools'
	| 'waiting_for_approval'
	| 'answering'
	| 'completed'
	| 'cancelled'
	| 'error';

export type ReasoningSummaryState = 'pending' | 'running' | 'completed' | 'error';

/**
 * Assistant transcript entry (provider-neutral). One per turn.
 */
export interface AssistantHistoryMessage {
	role: 'user' | 'assistant' | 'tool';
	content?: string | null;
	toolUseId?: string;
	isError?: boolean;
	contentBlocks?: Array<{
		type: 'text' | 'tool_use';
		text?: string;
		toolUseId?: string;
		toolName?: string;
		toolArgs?: unknown;
	}>;
}

export type AssistantToolCallStatus = 'ok' | 'error' | 'rejected';

export type AssistantResponseEvent =
	| {
			type: 'run_state';
			assistantId: string;
			runId: string;
			state: AssistantRunState;
			label?: string;
	  }
	| {
			type: 'reasoning_summary';
			assistantId: string;
			runId: string;
			id: string;
			title: string;
			summary: string;
			state: ReasoningSummaryState;
	  }
	| {
			type: 'text_delta';
			assistantId: string;
			runId: string;
			delta: string;
	  }
	| {
			type: 'tool_call_start';
			assistantId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
	  }
	| {
			type: 'tool_call_args_delta';
			assistantId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			jsonDelta: string;
			argsText: string;
	  }
	| {
			type: 'tool_call_input';
			assistantId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			argsText: string;
	  }
	| {
			type: 'tool_call_result';
			assistantId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			output: unknown;
			outputText: string;
			status: AssistantToolCallStatus;
			durationMs: number;
			errorText?: string;
	  };

export type AssistantResponseDelta = Extract<AssistantResponseEvent, { type: 'text_delta' }>;

export interface AssistantPendingApproval {
	id: string;
	kind: 'exec' | 'plugin' | 'api' | 'tool';
	toolName: string;
	question: string;
	title: string;
	description?: string;
	argsPreview?: unknown;
	command?: string;
	cwd?: string;
	envKeys?: string[];
	createdAtMs: number;
	expiresAtMs: number;
	allowedDecisions: ApprovalDecision[];
}

export interface AssistantPendingInput {
	id: string;
	question: string;
	suggestions?: string[];
}

export interface AssistantPendingState {
	approvals: AssistantPendingApproval[];
	inputs: AssistantPendingInput[];
}

export interface AssistantPendingEventPayload extends AssistantPendingState {
	assistantId: string;
}
