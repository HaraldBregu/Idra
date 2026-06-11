import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Session } from '../agent/core/session';
import type {
	SessionInput,
	Message,
	MessageContent,
	MessageContentBlock,
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
	private readonly sessionsPath?: string;
	private readonly sessionFolderName: string;

	constructor(input: SessionInput, location?: string) {
		super();
		this.id = input.sessionId ?? AgentSession.generateId();
		this.sessionFolderName = sessionFolderName(this.id);
		this.sessionsPath = location ? path.join(path.resolve(location), 'sessions') : undefined;
		this.messages = [...AgentSession.loadMessages(this.id, location), ...(input.messages ?? [])];
		if (input.message) this.messages.push({ role: 'user', content: input.message });
		this.model = input.model ?? 'default';
		this.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
		this.persist();
	}

	static loadMessages(sessionId: string, location?: string): Message[] {
		if (!location) return [];
		const sessionsPath = path.join(path.resolve(location), 'sessions');
		const filePath = existsSync(messagesFilePath(sessionsPath, sessionId))
			? messagesFilePath(sessionsPath, sessionId)
			: legacyFilePath(sessionsPath, sessionId);
		if (!existsSync(filePath)) return [];
		try {
			const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
			if (Array.isArray(raw)) return raw.filter(isMessage);
			if (isRecord(raw) && Array.isArray(raw.content)) return raw.content.filter(isMessage);
			return [];
		} catch {
			return [];
		}
	}

	appendRun(entry: unknown): void {
		if (!this.sessionsPath) return;
		this.ensureSession();
		appendFileSync(this.runFilePath(), `${stringifyRunEntry(entry)}\n`, 'utf8');
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
			stopReason: subtype === 'success' ? (this.stopReason ?? 'end_turn') : this.stopReason,
			usage: this.usage,
		};
	}

	private static generateId(): string {
		return randomUUID();
	}

	private persist(): void {
		if (!this.sessionsPath) return;
		this.ensureSession();
		writeFileSync(
			this.messagesFilePath(),
			`${JSON.stringify(this.messages, null, '\t')}\n`,
			'utf8'
		);
	}

	private ensureSession(): void {
		mkdirSync(this.sessionPath(), { recursive: true });
		if (!existsSync(this.messagesFilePath()))
			writeFileSync(this.messagesFilePath(), '[]\n', 'utf8');
		if (!existsSync(this.runFilePath())) writeFileSync(this.runFilePath(), '', 'utf8');
	}

	private sessionPath(): string {
		return sessionPath(this.sessionsPath ?? '', this.sessionFolderName);
	}

	private messagesFilePath(): string {
		return path.join(this.sessionPath(), 'messages.json');
	}

	private runFilePath(): string {
		return path.join(this.sessionPath(), 'run.jsonl');
	}
}

function sessionPath(sessionsPath: string, sessionFolderName: string): string {
	return path.join(sessionsPath, sessionFolderName);
}

function messagesFilePath(sessionsPath: string, sessionId: string): string {
	return path.join(sessionPath(sessionsPath, sessionFolderName(sessionId)), 'messages.json');
}

function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return path.join(sessionsPath, `${safeName(sessionId)}.json`);
}

function sessionFolderName(sessionId: string): string {
	return safeName(sessionId);
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
