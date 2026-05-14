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

export interface AssistantPendingApproval {
	id: string;
	toolName: string;
	question: string;
	args: unknown;
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

export interface AssistantResponseDelta {
	assistantId: string;
	runId: string;
	delta: string;
}
