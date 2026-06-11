import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Session, SessionStore, type SessionRecord } from '../agent/core/session';
import type {
	SessionInput,
	Message,
	MessageContent,
	MessageContentBlock,
	SessionResult,
	ToolCall,
	SessionTurn,
} from '../agent/core/types';

export type AgentSessionRecord = SessionRecord;

export class AgentSessionStore extends SessionStore {
	private readonly storePath: string;

	constructor(location: string, name = 'sessions') {
		super();
		this.storePath = path.join(path.resolve(location), name);
		mkdirSync(this.storePath, { recursive: true });
	}

	load(sessionId: string): SessionRecord | undefined {
		const filePath = this.filePath(sessionId);
		if (!existsSync(filePath)) return undefined;
		try {
			const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
			if (!isRecord(raw) || typeof raw.uuid !== 'string' || !Array.isArray(raw.content))
				return undefined;
			return {
				uuid: raw.uuid,
				content: raw.content.filter(isMessage),
			};
		} catch {
			return undefined;
		}
	}

	save(sessionId: string, content: Message[]): SessionRecord {
		mkdirSync(this.storePath, { recursive: true });
		const record = {
			uuid: this.load(sessionId)?.uuid ?? randomUUID(),
			content,
		};
		writeFileSync(this.filePath(sessionId), `${JSON.stringify(record, null, '\t')}\n`, 'utf8');
		return record;
	}

	filePath(sessionId: string): string {
		return path.join(this.storePath, `${safeName(sessionId)}.json`);
	}
}

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

	constructor(
		input: SessionInput,
		private readonly store?: SessionStore
	) {
		super();
		this.id = input.sessionId ?? AgentSession.generateId();
		this.messages = [...(this.store?.load(this.id)?.content ?? []), ...(input.messages ?? [])];
		if (input.message) this.messages.push({ role: 'user', content: input.message });
		this.model = input.model ?? 'default';
		this.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
		this.persist();
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
		this.messages.push({
			role: 'assistant',
			content: [{ type: 'text', text: content }],
			toolCalls,
		});
		this.persist();
	}

	addToolResults(toolCalls: ToolCall[], results: Message[]): void {
		this.toolCalls.push(...toolCalls);
		this.messages.push(...results);
		this.numTurns += 1;
		this.persist();
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
		return randomUUID();
	}

	private persist(): void {
		this.store?.save(this.id, this.messages);
	}
}

function safeName(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'session';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isContentBlock(value: unknown): value is MessageContentBlock {
	return isRecord(value) && typeof value.type === 'string';
}

function isMessageContent(value: unknown): value is MessageContent {
	return typeof value === 'string' || (Array.isArray(value) && value.every(isContentBlock));
}

function isToolCall(value: unknown): value is ToolCall {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		isRecord(value.args)
	);
}

function isMessage(value: unknown): value is Message {
	if (!isRecord(value)) return false;
	if (
		value.role !== 'system' &&
		value.role !== 'user' &&
		value.role !== 'assistant' &&
		value.role !== 'tool'
	)
		return false;
	if (!isMessageContent(value.content)) return false;
	if (value.toolUseId !== undefined && typeof value.toolUseId !== 'string') return false;
	if (value.toolCalls !== undefined) {
		if (!Array.isArray(value.toolCalls)) return false;
		if (!value.toolCalls.every(isToolCall)) return false;
	}
	return true;
}
