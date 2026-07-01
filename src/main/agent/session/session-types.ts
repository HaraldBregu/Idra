import type {
	Message,
	MessageContentBlock,
	SessionInput,
	SessionCategory,
	SessionResult,
	ToolCall,
	SessionTurn,
} from '../core/types';

export const DEFAULT_CATEGORY: SessionCategory = 'home';

export interface SessionState {
	id: string;
	messages: Message[];
	toolCalls: ToolCall[];
	usage: { inputTokens: number; outputTokens: number };
	maxTurns: number;
	model: string;
	numTurns: number;
	finalText: string;
	stopReason?: string;
	sessionsPath: string;
	folderName: string;
}

export interface Session {
	id: string;
	messages: Message[];
	readonly toolCalls: ToolCall[];
	readonly usage: { inputTokens: number; outputTokens: number };
	maxTurns: number;
	model: string;
	numTurns: number;
	finalText: string;
	stopReason?: string;
	readonly isExhausted: boolean;
	init(input: SessionInput, category?: SessionCategory): Session;
	loadMessages(sessionId: string, category?: SessionCategory): Message[];
	clearMessages(sessionId: string, category?: SessionCategory): void;
	appendRun(entry: unknown): void;
	recordTurn(turn: SessionTurn): void;
	addAssistantMessage(
		content: string,
		toolCalls: ToolCall[],
		providerItems?: MessageContentBlock[]
	): void;
	addToolResults(toolCalls: ToolCall[]): void;
	toResult(subtype: SessionResult['subtype']): SessionResult;
}
