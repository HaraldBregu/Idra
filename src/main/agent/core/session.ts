import type {
	SessionMessage,
	SessionResult,
	SessionToolCall,
	SessionTurn,
	SessionUsage,
} from '../types';
} from './types';

export abstract class Session {
	abstract readonly id: string;
	abstract readonly messages: SessionMessage[];
	abstract readonly toolCalls: SessionToolCall[];
	abstract readonly usage: SessionUsage;
	abstract readonly maxTurns: number;

	abstract model: string;
	abstract numTurns: number;
	abstract finalText: string;
	abstract stopReason?: string;

	abstract get isExhausted(): boolean;

	abstract recordTurn(turn: SessionTurn): void;
	abstract addAssistantMessage(content: string, toolCalls: SessionToolCall[]): void;
	abstract addToolResults(
		toolCalls: SessionToolCall[],
		results: SessionMessage[]
	): void;
	abstract toResult(subtype: SessionResult['subtype']): SessionResult;
}
