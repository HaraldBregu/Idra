import type { Message, ToolCall } from './types';

export type ModelToolSchema = {
	name: string;
	description: string;
	schema: unknown;
};

export type ModelRequest = {
	messages: Message[];
	systemPrompt: string;
	tools: ModelToolSchema[];
	signal?: AbortSignal;
};

export type ModelEvent =
	| { type: 'text_delta'; text: string }
	| { type: 'tool_call'; toolCall: ToolCall }
	| { type: 'message_end'; usage?: { inputTokens: number; outputTokens: number } };

export type ModelClient = {
	stream(request: ModelRequest): AsyncIterable<ModelEvent>;
};
