export type RuntimeRole = 'system' | 'user' | 'assistant' | 'tool';

export interface RuntimeMessage {
	role: RuntimeRole;
	content: string;
	toolUseId?: string;
}

export interface RuntimeTool {
	name: string;
	description?: string;
}

export interface RuntimeModelRequest {
	model: string;
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
	maxTokens: number;
	signal?: AbortSignal;
}

export interface RuntimeModelResponse {
	text: string;
	model: string;
	stopReason?: string;
}

export interface RuntimeModel {
	generate(request: RuntimeModelRequest): Promise<RuntimeModelResponse>;
}

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimeInput {
	task: string;
	message: string;
	system?: string;
	messages?: RuntimeMessage[];
	tools?: RuntimeTool[];
	model?: string;
	modelRoutes?: RuntimeModelRoute[];
	maxTokens?: number;
	maxRetries?: number;
	signal?: AbortSignal;
}

export interface RuntimeToolCall {
	name: string;
	args: Record<string, unknown>;
}

export interface RuntimeOutput {
	text: string;
	model: string;
	toolCalls: RuntimeToolCall[];
	stopReason?: string;
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: RuntimeMessage[];
}

export interface RuntimePerception {
	prompt: RuntimePrompt;
	model: string;
	maxTokens: number;
	maxRetries: number;
	signal?: AbortSignal;
}
