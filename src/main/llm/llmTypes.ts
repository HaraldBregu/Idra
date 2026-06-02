import type { ModelReasoningEffort } from '../../shared/agents/service';

/**
 * Provider-neutral abstraction over chat-style LLM APIs.
 *
 * Adapters translate the unified {@link TranscriptEntry} model and tool specs
 * into each vendor's native shape, and emit unified {@link ProviderEvent}s
 * over an async iterable.
 */

export interface Usage {
	inputTokens: number;
	outputTokens: number;
}

export type ProviderEvent =
	| { type: 'message_start' }
	| { type: 'reasoning_item'; provider?: 'openai' | 'deepseek'; item: unknown }
	| { type: 'text_delta'; text: string }
	| { type: 'tool_call_start'; id: string; name: string }
	| { type: 'tool_call_args_delta'; id: string; jsonDelta: string }
	| { type: 'tool_call_end'; id: string }
	| { type: 'message_end'; stopReason: string; usage: Usage };

export type AgentContentBlock =
	| { type: 'text'; text: string }
	| { type: 'reasoning'; provider: 'openai' | 'deepseek'; item: unknown }
	| {
			type: 'tool_use';
			toolUseId: string;
			toolName: string;
			toolArgs: unknown;
	  };

export type ToolResultBlock =
	| { type: 'text'; text: string }
	| { type: 'image'; mimeType?: string; base64?: string };

export type ToolResultStatus = 'ok' | 'error' | 'blocked' | 'rejected';

export type TranscriptEntry =
	| { role: 'user'; content: string }
	| { role: 'assistant'; content: AgentContentBlock[] }
	| {
			role: 'tool';
			toolUseId: string;
			content: ToolResultBlock[];
			isError?: boolean;
			status?: ToolResultStatus;
	  };

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

export interface ProviderToolSpec {
	name: string;
	description: string;
	schema: JSONSchema;
}

export interface ProviderStreamRequest {
	model: string;
	effort?: ModelReasoningEffort;
	system: string;
	messages: TranscriptEntry[];
	tools: ProviderToolSpec[];
	maxTokens: number;
	signal?: AbortSignal;
}

export interface ProviderAdapter {
	stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent>;
}

export class ContextOverflowError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContextOverflowError';
	}
}

export class ProviderAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProviderAuthError';
	}
}
