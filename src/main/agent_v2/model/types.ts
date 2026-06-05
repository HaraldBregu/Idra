export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelMessage {
	role: ModelMessageRole;
	content: string;
	toolUseId?: string;
}

export interface ModelRequest {
	messages: ModelMessage[];
	system?: string;
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

export interface StatelessLlm {
	generate(request: ModelRequest): Promise<ModelResponse>;
}

export interface ModelModule {
	generate(request: ModelRequest): Promise<ModelResponse>;
}
