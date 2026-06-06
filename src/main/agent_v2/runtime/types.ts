import type {
	ModelMessage,
	ModelMessageRole,
	ModelModule,
	ModelProvider,
	ModelRequest,
	ModelResponse,
} from '../model/types';

export type RuntimeRole = ModelMessageRole;
export type RuntimeMessage = ModelMessage;

export interface RuntimeTool {
	name: string;
	description?: string;
}

export type RuntimeModelRequest = ModelRequest;
export type RuntimeModelResponse = ModelResponse;
export type RuntimeModel = ModelModule;

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimeInput {
	task: string;
	message: string;
	provider: ModelProvider;
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
	provider: ModelProvider;
	model: string;
	maxTokens: number;
	maxRetries: number;
	signal?: AbortSignal;
}
