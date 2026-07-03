import type { MessageContentBlock, ToolCall } from '../types';

export interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
	providerItems?: MessageContentBlock[];
}
