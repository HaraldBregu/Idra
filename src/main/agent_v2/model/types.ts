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

export type ModelEvent =
	| { type: 'model_call_start'; model: string }
	| { type: 'model_call_delta'; delta: string }
	| {
			type: 'model_call_end';
			model: string;
			stopReason?: string;
			usage?: ModelResponse['usage'];
	  };

export interface ModelModule {
	generate(request: ModelRequest): Promise<ModelResponse>;
	stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
