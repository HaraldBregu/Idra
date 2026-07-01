import type { ModelReasoningEffort } from '../../../shared/agent/types';
import type { Message, MessageContentBlock, ToolCall } from '../core/types';

export const DEFAULT_CATEGORY: SessionCategory = 'home';

export type SessionCategory = 'home' | 'task' | 'heartbeat';

export type SessionResultSubtype = 'success' | 'error_max_turns';

export interface SessionUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface SessionResult {
	text: string;
	model: string;
	toolCalls: ToolCall[];
	numTurns: number;
	subtype: SessionResultSubtype;
	sessionId: string;
	stopReason?: string;
	usage?: SessionUsage;
}

export interface SessionInput {
	task: string;
	message: string;
	sessionId?: string;
	messages?: Message[];
	model?: string;
	effort?: ModelReasoningEffort;
	maxTurns?: number;
	maxIterations?: number;
}

export interface SessionTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	providerItems?: MessageContentBlock[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export interface SessionState {
	id: string;
	messages: Message[];
	toolCalls: ToolCall[];
	usage: SessionUsage;
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
	readonly usage: SessionUsage;
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
	toResult(subtype: SessionResultSubtype): SessionResult;
}
