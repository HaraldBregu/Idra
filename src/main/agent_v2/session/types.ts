import type { RuntimeOutput } from '../loop/types';
import type { ModelMessage, ModelToolCall } from '../model/types';

export type SessionMessage = ModelMessage;
export type SessionToolCall = ModelToolCall;
export type SessionResult = RuntimeOutput;

export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: SessionMessage[];
	model?: string;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: SessionToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}
