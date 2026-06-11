import type {
	Message,
	SessionResult,
	ToolCall,
	SessionTurn,
	SessionUsage,
} from './types';

export abstract class SessionStore {
	abstract load(sessionId: string): Message[] | undefined;
	abstract save(sessionId: string, content: Message[]): Message[];
}

export abstract class Session {
	abstract readonly id: string;
	abstract readonly messages: Message[];
	abstract readonly toolCalls: ToolCall[];
	abstract readonly usage: SessionUsage;
	abstract readonly maxTurns: number;

	abstract model: string;
	abstract numTurns: number;
	abstract finalText: string;
	abstract stopReason?: string;

	abstract get isExhausted(): boolean;

	abstract recordTurn(turn: SessionTurn): void;
	abstract addAssistantMessage(content: string, toolCalls: ToolCall[]): void;
	abstract addToolResults(
		toolCalls: ToolCall[],
		results: Message[]
	): void;
	abstract toResult(subtype: SessionResult['subtype']): SessionResult;
}
