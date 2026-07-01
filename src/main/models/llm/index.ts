import type { Tool } from '../../agent/types';
import type { Message, Provider, ToolCall } from '../../agent/types';
import type { ModelReasoningEffort } from '../../../shared/agent/types';

export interface ModelRequest {
	messages: Message[];
	systemPrompt?: string;
	provider: Provider;
	model: string;
	effort?: ModelReasoningEffort;
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
	| { type: 'model_call_start'; model: string; effort?: ModelReasoningEffort }
	| { type: 'model_call_delta'; delta: string }
	| { type: 'model_provider_item'; provider: 'openai'; item: unknown }
	| { type: 'model_tool_call_start'; id: string; name: string }
	| { type: 'model_tool_call_args_delta'; id: string; jsonDelta: string }
	| { type: 'model_tool_call_end'; id: string }
	| {
			type: 'model_call_end';
			model: string;
			stopReason?: string;
			usage?: ModelResponse['usage'];
	  };

export { AgentModel } from './model';
