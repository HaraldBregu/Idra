import type { ModelEvent } from '../../llm';
import type { CronFunctionId } from '../cron';

export interface Config {
	location: string;
}

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

export interface ContextState {
	path?: string;
}

export abstract class Context {
	abstract get path(): string | undefined;
	abstract setPath(path: string): void;
	abstract snapshot(): ContextState;
}

export abstract class Tool {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
	constructor(readonly context: Context) {}
	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}

export abstract class BaseTool extends Tool {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
}

export abstract class CronTool extends Tool {
	abstract readonly name: CronFunctionId;
	abstract readonly description: string;
	abstract readonly schema: JSONSchema;
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

import type {
	SessionCategory,
	SessionInput,
	SessionResult,
	SessionResultSubtype,
	SessionTurn,
	SessionUsage,
} from '../session/session-types';

export type {
	SessionCategory,
	SessionInput,
	SessionResult,
	SessionResultSubtype,
	SessionTurn,
	SessionUsage,
};

export type RuntimeModelEvent = ModelEvent;

export type RuntimeOutput = SessionResult;

export interface RuntimeInput {
	task: string;
	message: string;
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
			durationMs: number;
	  }
	| { type: 'run_finished'; result: RuntimeOutput };
