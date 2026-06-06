import { composeMessages } from './messages';
import type { RuntimeInput, RuntimeMessage, RuntimeToolCall } from './types';

export interface RuntimeSession {
	id: string;
	messages: RuntimeMessage[];
	toolCalls: RuntimeToolCall[];
	usage: {
		inputTokens: number;
		outputTokens: number;
	};
	numTurns: number;
	finalText: string;
	model: string;
	stopReason?: string;
	maxTurns: number;
}

export function createRuntimeSession(input: RuntimeInput): RuntimeSession {
	return {
		id:
			input.sessionId ??
			`runtime-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
		messages: composeMessages(input),
		toolCalls: [],
		usage: { inputTokens: 0, outputTokens: 0 },
		numTurns: 0,
		finalText: '',
		model: input.model ?? 'default',
		maxTurns: input.maxTurns ?? input.maxIterations ?? 20,
	};
}
