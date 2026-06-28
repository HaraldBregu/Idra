import type { ModelEvent } from './model';
import type { Tool } from './tool';
import type { ModelReasoningEffort } from '../../../shared/agent/types';

export interface Provider {
	id: string,
	apiKey: string,
	baseURL: string,
}

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ToolResult {
	content: MessageContent;
	isError?: boolean;
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
	result?: ToolResult;
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

export interface MessageContentBlock {
	type: string;
	[key: string]: unknown;
}

export type MessageContent = string | MessageContentBlock[];

export interface Message {
	role: MessageRole;
	content: MessageContent;
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

export type SessionCategory = 'home' | 'task' | 'heartbeat';

export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: Message[];
	model?: string;
	effort?: ModelReasoningEffort;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	providerItems?: MessageContentBlock[];
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
	effort?: ModelReasoningEffort;
	maxTokens?: number;
	maxRetries?: number;
	maxTurns?: number;
	maxIterations?: number;
	requestPermission?: (toolCall: ToolCall) => Promise<boolean>;
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
			rejected?: boolean;
			durationMs: number;
	  }
	| { type: 'run_finished'; result: RuntimeOutput };
