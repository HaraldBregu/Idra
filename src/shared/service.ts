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
