import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Session, SessionStore } from '../agent/core/session';
import type {
	SessionInput,
	Message,
	MessageContent,
	MessageContentBlock,
	SessionResult,
	ToolCall,
	SessionTurn,
} from '../agent/core/types';

export class AgentSessionStore extends SessionStore {
	private readonly storePath: string;

	constructor(location: string, name = 'sessions') {
		super();
		this.storePath = path.join(path.resolve(location), name);
		mkdirSync(this.storePath, { recursive: true });
	}

	appendRun(sessionId: string, entry: unknown): void {
		this.ensureSession(sessionId);
		appendFileSync(this.runFilePath(sessionId), `${stringifyRunEntry(entry)}\n`, 'utf8');
	}

	load(sessionId: string): Message[] | undefined {
		const filePath = existsSync(this.messagesFilePath(sessionId))
			? this.messagesFilePath(sessionId)
			: this.legacyFilePath(sessionId);
		if (!existsSync(filePath)) return undefined;
		try {
			const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
			if (Array.isArray(raw)) return raw.filter(isMessage);
			if (isRecord(raw) && Array.isArray(raw.content))
				return raw.content.filter(isMessage);
			return undefined;
		} catch {
			return undefined;
		}
	}

	save(sessionId: string, content: Message[]): Message[] {
		this.ensureSession(sessionId);
		writeFileSync(this.messagesFilePath(sessionId), `${JSON.stringify(content, null, '\t')}\n`, 'utf8');
		return content;
	}

	sessionPath(sessionId: string): string {
		return path.join(this.storePath, safeName(sessionId));
	}

	messagesFilePath(sessionId: string): string {
		return path.join(this.sessionPath(sessionId), 'messages.json');
	}

	runFilePath(sessionId: string): string {
		return path.join(this.sessionPath(sessionId), 'run.jsonl');
	}

	private legacyFilePath(sessionId: string): string {
		return path.join(this.storePath, `${safeName(sessionId)}.json`);
	}

	private ensureSession(sessionId: string): void {
		const sessionPath = this.sessionPath(sessionId);
		mkdirSync(sessionPath, { recursive: true });
		if (!existsSync(this.messagesFilePath(sessionId)))
			writeFileSync(this.messagesFilePath(sessionId), '[]\n', 'utf8');
		if (!existsSync(this.runFilePath(sessionId)))
			writeFileSync(this.runFilePath(sessionId), '', 'utf8');
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
		this.messages = [...(this.store?.load(this.id) ?? []), ...(input.messages ?? [])];
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

function stringifyRunEntry(entry: unknown): string {
	const timestamp = new Date().toISOString();
	try {
		return JSON.stringify({ timestamp, event: entry });
	} catch {
		return JSON.stringify({ timestamp, event: { type: 'unserializable' } });
	}
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
