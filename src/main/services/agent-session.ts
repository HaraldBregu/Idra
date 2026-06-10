import { Session } from '../agent/core/session';
import type {
	SessionInput,
	Message,
	SessionResult,
	ToolCall,
	SessionTurn,
} from '../agent/core/types';

export class AgentSession extends Session {
	readonly id: string;
	readonly messages: Message[];
	readonly toolCalls: ToolCall[] = [];
	readonly usage = { inputTokens: 0, outputTokens: 0 };
	readonly maxTurns: number;

	model: string;
	numTurns = 0;
	finalText = '';
	stopReason?: string;

	constructor(input: SessionInput) {
		super();
		this.id = input.sessionId ?? AgentSession.generateId();
		this.messages = [...(input.messages ?? [])];
		if (input.message) this.messages.push({ role: 'user', content: input.message });
		this.model = input.model ?? 'default';
		this.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
	}

	get isExhausted(): boolean {
		return this.numTurns >= this.maxTurns;
	}

	recordTurn(turn: SessionTurn): void {
		this.model = turn.model;
		this.stopReason = turn.stopReason;
		this.usage.inputTokens += turn.usage?.inputTokens ?? 0;
		this.usage.outputTokens += turn.usage?.outputTokens ?? 0;
		if (turn.content) this.finalText = turn.content;
	}

	addAssistantMessage(content: string, toolCalls: ToolCall[]): void {
		this.messages.push({ role: 'assistant', content, toolCalls });
	}

	addToolResults(toolCalls: ToolCall[], results: Message[]): void {
		this.toolCalls.push(...toolCalls);
		this.messages.push(...results);
		this.numTurns += 1;
	}

	toResult(subtype: SessionResult['subtype']): SessionResult {
		return {
			text: subtype === 'success' ? this.finalText : '',
			model: this.model,
			toolCalls: this.toolCalls,
			numTurns: this.numTurns,
			subtype,
			sessionId: this.id,
			stopReason:
				subtype === 'success' ? this.stopReason ?? 'end_turn' : this.stopReason,
			usage: this.usage,
		};
	}

	private static generateId(): string {
		return `runtime-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	}
}
