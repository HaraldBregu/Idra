import type { JSONSchema } from '../llm/types';

export interface Provider {
	id: string,
	apiKey: string,
	baseURL: string,
}

export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelTool {
	name: string;
	description?: string;
	schema?: JSONSchema;
}

export interface ModelToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface ModelMessage {
	role: ModelMessageRole;
	content: string;
	toolUseId?: string;
	toolCalls?: ModelToolCall[];
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
	tools?: ModelTool[];
	signal?: AbortSignal;
}

export interface ModelResponse {
	content: string;
	toolCalls?: ModelToolCall[];
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
	| { type: 'model_tool_call_start'; id: string; name: string }
	| { type: 'model_tool_call_args_delta'; id: string; jsonDelta: string }
	| { type: 'model_tool_call_end'; id: string }
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

export type SessionMessage = ModelMessage;
export type SessionToolCall = ModelToolCall;

export interface SessionUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface SessionResult {
	text: string;
	model: string;
	toolCalls: SessionToolCall[];
	numTurns: number;
	subtype: 'success' | 'error_max_turns';
	sessionId: string;
	stopReason?: string;
	usage?: SessionUsage;
}

export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: SessionMessage[];
	model?: string;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: SessionToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}
