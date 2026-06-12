import type { ModelEvent } from './model';
import type { Tool } from './tool';

export interface Provider {
	id: string,
	apiKey: string,
	baseURL: string,
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
}

export interface JSONSchema {
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	items?: unknown;
	description?: string;
	enum?: unknown[];
	additionalProperties?: boolean | unknown;
	[k: string]: unknown;
}

export interface ToolContextState {
	path?: string;
}

export interface MessageContentBlock {
	type: string;
	[key: string]: unknown;
}

export type MessageContent = string | MessageContentBlock[];

export interface Message {
	role: MessageRole;
	content: MessageContent;
	toolUseId?: string;
	toolCalls?: ToolCall[];
}

export interface SessionUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface SessionResult {
	text: string;
	model: string;
	toolCalls: ToolCall[];
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
	messages?: Message[];
	model?: string;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export type RuntimeModelEvent = ModelEvent;

export type RuntimeOutput = SessionResult;

export interface RuntimeInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: Message[];
	tools?: Tool[];
	modelRoutes?: RuntimeModelRoute[];
	maxTokens?: number;
	maxRetries?: number;
	maxTurns?: number;
	maxIterations?: number;
}

export interface RuntimeModelRoute {
	task: string;
	model: string;
}

export interface RuntimePrompt {
	system: string;
	prompt: string;
	messages: Message[];
}

export interface RuntimePerception {
	prompt: RuntimePrompt;
	model: string;
	maxTokens: number;
	maxRetries: number;
	maxIterations: number;
	tools: Tool[];
	signal?: AbortSignal;
}

export type RuntimeEvent =
	| RuntimeModelEvent
	| { type: 'run_started'; sessionId: string; model: string; providerId: string }
	| { type: 'assistant_message'; content: string; toolCalls: ToolCall[] }
	| { type: 'user_message'; messages: Message[] }
	| {
			type: 'tool_call_start';
			toolCallId: string;
			toolName: string;
			input: Record<string, unknown>;
	  }
	| {
			type: 'tool_call_end';
			toolCallId: string;
			toolName: string;
			input: Record<string, unknown>;
			output: unknown;
			isError?: boolean;
			durationMs: number;
	  }
	| { type: 'run_finished'; result: RuntimeOutput };
