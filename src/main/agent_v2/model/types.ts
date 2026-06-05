export type CoreMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface CoreMessage {
	role: CoreMessageRole;
	content: string;
	toolUseId?: string;
}

export interface CoreRequest {
	messages: CoreMessage[];
	system?: string;
	model: string;
	maxTokens: number;
	signal?: AbortSignal;
}

export interface CoreResponse {
	content: string;
	model?: string;
	stopReason?: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export interface StatelessLlm {
	generate(request: CoreRequest): Promise<CoreResponse>;
}

export interface CoreModule {
	generate(request: CoreRequest): Promise<CoreResponse>;
}
