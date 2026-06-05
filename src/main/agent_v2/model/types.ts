export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelMessage {
	role: ModelMessageRole;
	content: string;
	toolUseId?: string;
}

export interface ModelProvider {
	id: string;
	apiKey: string;
	baseURL?: string;
}

export interface ModelRequest {
	messages: ModelMessage[];
	system?: string;
	provider: ModelProvider;
	model: string;
	maxTokens: number;
	signal?: AbortSignal;
}

export interface ModelResponse {
	content: string;
	model?: string;
	stopReason?: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export interface ModelModule {
	generate(request: ModelRequest): Promise<ModelResponse>;
}
