import { composeMessages } from '../shared/messages';
import type { ModelMessage, ModelToolCall } from '../model/types';

/**
 * Transcript message stored on a runtime session.
 */
export type SessionMessage = ModelMessage;
/**
 * Tool call captured during a runtime session.
 */
export type SessionToolCall = ModelToolCall;

/**
 * Input accepted by {@link createRuntimeSession}.
 */
export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: SessionMessage[];
	model?: string;
	maxTurns?: number;
	maxIterations?: number;
}

export interface RuntimeSession {
	id: string;
	messages: SessionMessage[];
	toolCalls: SessionToolCall[];
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

export function createRuntimeSession(input: SessionInput): RuntimeSession {
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
