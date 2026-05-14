import { Provider } from "./providers";

export interface Service {
	assistant: Assistant;
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

export interface AssistantHistoryMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content?: string | null;
	name?: string;
	tool_call_id?: string;
	tool_calls?: Array<{
		id: string;
		type: 'function';
		function: { name: string; arguments: string };
	}>;
}

export interface AssistantPendingApproval {
	callId: string;
	toolName: string;
	arguments: string;
}

export interface AssistantPendingInput {
	callId: string;
	toolName: string;
	question: string;
	suggestions?: string[];
}

export interface AssistantSendResult {
	status:
		| 'completed'
		| 'awaiting_approval'
		| 'awaiting_input'
		| 'max_iterations'
		| 'cancelled';
	text: string;
	pending: AssistantPendingApproval[];
	pendingInputs: AssistantPendingInput[];
}

export interface AssistantPendingEventPayload {
	assistantId: string;
	runId: string;
	pending: AssistantPendingApproval[];
	pendingInputs: AssistantPendingInput[];
}
