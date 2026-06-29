import { randomUUID } from 'node:crypto';
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { resolveAgentUsageLocation } from '../shared/location';
import type {
	SessionInput,
	SessionCategory,
	Message,
	MessageContent,
	MessageContentBlock,
	SessionResult,
	ToolCall,
	SessionTurn,
} from './types';

const DEFAULT_CATEGORY: SessionCategory = 'home';
const LOCATION = resolveAgentUsageLocation();

export class Session {
	readonly id: string;
	readonly messages: Message[];
	readonly toolCalls: ToolCall[] = [];
	readonly usage = { inputTokens: 0, outputTokens: 0 };
	readonly maxTurns: number;

	model: string;
	numTurns = 0;
	finalText = '';
	stopReason?: string;
	private readonly sessionsPath: string;
	private readonly sessionFolderName: string;

	constructor(input: SessionInput, category: SessionCategory = DEFAULT_CATEGORY) {
		this.id = resolveSessionId(input.sessionId, category, LOCATION);
		this.sessionFolderName = sessionFolderName(this.id);
		this.sessionsPath = sessionsRoot(LOCATION, category);
		const storedMessages = loadMessagesBySessionId(this.id, category, LOCATION);
		const legacyMessages =
			input.sessionId && input.sessionId !== this.id && storedMessages.length === 0
				? loadMessagesBySessionId(input.sessionId, category, LOCATION)
				: [];
		this.messages = [
			...(storedMessages.length > 0 ? storedMessages : legacyMessages),
			...(input.messages ?? []),
		];
		if (input.message) this.messages.push({ role: 'user', content: input.message });
		this.model = input.model ?? 'default';
		this.maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
		this.persist();
	}

	static loadMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): Message[] {
		const resolvedSessionId = resolveStoredSessionId(sessionId, category, LOCATION);
		return loadMessagesBySessionId(resolvedSessionId, category, LOCATION);
	}

	static clearMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): void {
		const resolvedSessionId = resolveStoredSessionId(sessionId, category, LOCATION);
		clearMessagesBySessionId(resolvedSessionId, category, LOCATION);
	}

	appendRun(entry: unknown): void {
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

	addAssistantMessage(
		content: string,
		toolCalls: ToolCall[],
		providerItems: MessageContentBlock[] = []
	): void {
		const contentBlocks: MessageContentBlock[] = [...providerItems];
		if (content || contentBlocks.length === 0) {
			contentBlocks.push({ type: 'text', text: content });
		}
		this.messages.push({
			role: 'assistant',
			content: contentBlocks,
			...(toolCalls.length > 0 ? { toolCalls } : {}),
		});
		this.persist();
	}

	addToolResults(toolCalls: ToolCall[]): void {
		this.toolCalls.push(...toolCalls);
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

	private persist(): void {
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
		return sessionPath(this.sessionsPath, this.sessionFolderName);
	}

	private messagesFilePath(): string {
		return path.join(this.sessionPath(), 'messages.json');
	}

	private runFilePath(): string {
		return path.join(this.sessionPath(), 'run.jsonl');
	}
}

function loadMessagesBySessionId(
	sessionId: string,
	category: SessionCategory,
	location?: string
): Message[] {
	if (!location) return [];
	const sessionsPath = sessionsRoot(location, category);
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

function clearMessagesBySessionId(
	sessionId: string,
	category: SessionCategory,
	location: string
): void {
	const sessionsPath = sessionsRoot(location, category);
	const filePath = existsSync(messagesFilePath(sessionsPath, sessionId))
		? messagesFilePath(sessionsPath, sessionId)
		: legacyFilePath(sessionsPath, sessionId);
	if (!existsSync(filePath)) return;
	writeFileSync(filePath, '[]\n', 'utf8');

	const runFilePath = path.join(sessionPath(sessionsPath, sessionFolderName(sessionId)), 'run.jsonl');
	if (existsSync(runFilePath)) writeFileSync(runFilePath, '', 'utf8');
}

function sessionsRoot(location: string, category: SessionCategory): string {
	return path.join(path.resolve(location), 'sessions', category);
}

function sessionPath(sessionsPath: string, sessionFolderName: string): string {
	return path.join(sessionsPath, sessionFolderName);
}

function resolveSessionId(
	sessionId: string | undefined,
	category: SessionCategory,
	location?: string
): string {
	if (!sessionId) return randomUUID();
	if (isUuid(sessionId) || !location) return sessionId;

	return latestUuidSessionId(sessionsRoot(location, category)) ?? randomUUID();
}

function resolveStoredSessionId(
	sessionId: string,
	category: SessionCategory,
	location?: string
): string {
	if (isUuid(sessionId) || !location) return sessionId;
	return latestUuidSessionId(sessionsRoot(location, category)) ?? sessionId;
}

function latestUuidSessionId(sessionsPath: string): string | undefined {
	if (!existsSync(sessionsPath)) return undefined;
	try {
		return readdirSync(sessionsPath, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && isUuid(entry.name))
			.map((entry) => {
				const stats = statSync(sessionPath(sessionsPath, entry.name));
				return {
					name: entry.name,
					createdAtMs: stats.birthtimeMs || stats.ctimeMs || stats.mtimeMs,
				};
			})
			.sort((a, b) => b.createdAtMs - a.createdAtMs || b.name.localeCompare(a.name))[0]?.name;
	} catch {
		return undefined;
	}
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

function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function isToolResult(value: unknown): value is NonNullable<ToolCall['result']> {
	return isRecord(value) && isMessageContent(value.content);
}

function isToolCall(value: unknown): value is ToolCall {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		isRecord(value.args) &&
		(value.result === undefined || isToolResult(value.result))
	);
}

function isMessage(value: unknown): value is Message {
	if (!isRecord(value)) return false;
	if (value.role !== 'system' && value.role !== 'user' && value.role !== 'assistant') return false;
	if (!isMessageContent(value.content)) return false;
	if (value.toolCalls !== undefined) {
		if (!Array.isArray(value.toolCalls)) return false;
		if (!value.toolCalls.every(isToolCall)) return false;
	}
	return true;
}
