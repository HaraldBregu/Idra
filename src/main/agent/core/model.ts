import type { Tool } from './tool';
import type { Message, Provider, ToolCall } from './types';

export interface ModelRequest {
	messages: Message[];
	system?: string;
	provider: Provider;
	model: string;
	maxTokens: number;
	tools?: Tool[];
	signal?: AbortSignal;
}

export interface ModelResponse {
	content: string;
	toolCalls?: ToolCall[];
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

export abstract class Model {
	abstract generate(request: ModelRequest): Promise<ModelResponse>;
	abstract stream(request: ModelRequest): AsyncIterable<ModelEvent>;
}
