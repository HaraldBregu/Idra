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
import type { Config } from '../core/config';
import type {
	SessionInput,
	SessionCategory,
	Message,
	MessageContent,
	MessageContentBlock,
	SessionResult,
	ToolCall,
	SessionTurn,
} from '../core/types';

const DEFAULT_CATEGORY: SessionCategory = 'home';

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

export function session(config: Config): Session {
	let id = '';
	let messages: Message[] = [];
	const toolCalls: ToolCall[] = [];
	const usage = { inputTokens: 0, outputTokens: 0 };
	let maxTurns = 20;
	let model = 'default';
	let numTurns = 0;
	let finalText = '';
	let stopReason: string | undefined;
	let sessionsPath = '';
	let folderName = '';

	const persist = (): void => {
		ensureSession();
		writeFileSync(
			messagesFilePath(),
			`${JSON.stringify(messages, null, '\t')}\n`,
			'utf8'
		);
	};

	const ensureSession = (): void => {
		mkdirSync(sessionDir(), { recursive: true });
		if (!existsSync(messagesFilePath())) writeFileSync(messagesFilePath(), '[]\n', 'utf8');
		if (!existsSync(runFilePath())) writeFileSync(runFilePath(), '', 'utf8');
	};

	const sessionDir = (): string => {
		return sessionPath(sessionsPath, folderName);
	};

	const messagesFilePath = (): string => {
		return path.join(sessionDir(), 'messages.json');
	};

	const runFilePath = (): string => {
		return path.join(sessionDir(), 'run.jsonl');
	};

	return {
		get id() {
			return id;
		},
		set id(value: string) {
			id = value;
		},
		get messages() {
			return messages;
		},
		set messages(value: Message[]) {
			messages = value;
		},
		toolCalls,
		usage,
		get maxTurns() {
			return maxTurns;
		},
		set maxTurns(value: number) {
			maxTurns = value;
		},
		get model() {
			return model;
		},
		set model(value: string) {
			model = value;
		},
		get numTurns() {
			return numTurns;
		},
		set numTurns(value: number) {
			numTurns = value;
		},
		get finalText() {
			return finalText;
		},
		set finalText(value: string) {
			finalText = value;
		},
		get stopReason() {
			return stopReason;
		},
		set stopReason(value: string | undefined) {
			stopReason = value;
		},
		get isExhausted() {
			return numTurns >= maxTurns;
		},
		init(input: SessionInput, category: SessionCategory = DEFAULT_CATEGORY): Session {
			id = resolveSessionId(input.sessionId, category, config.location);
			folderName = sessionFolderName(id);
			sessionsPath = sessionsRoot(config.location, category);
			const storedMessages = loadMessagesBySessionId(id, category, config.location);
			const legacyMessages =
				input.sessionId && input.sessionId !== id && storedMessages.length === 0
					? loadMessagesBySessionId(input.sessionId, category, config.location)
					: [];
			messages = [
				...(storedMessages.length > 0 ? storedMessages : legacyMessages),
				...(input.messages ?? []),
			];
			if (input.message) messages.push({ role: 'user', content: input.message });
			model = input.model ?? 'default';
			maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
			persist();
			return self;
		},
		loadMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): Message[] {
			const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
			return loadMessagesBySessionId(resolvedSessionId, category, config.location);
		},
		clearMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): void {
			const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
			clearMessagesBySessionId(resolvedSessionId, category, config.location);
			if (id === resolvedSessionId) messages = [];
		},
		appendRun(entry: unknown): void {
			ensureSession();
			appendFileSync(runFilePath(), `${stringifyRunEntry(entry)}\n`, 'utf8');
		},
		recordTurn(turn: SessionTurn): void {
			model = turn.model;
			stopReason = turn.stopReason;
			usage.inputTokens += turn.usage?.inputTokens ?? 0;
			usage.outputTokens += turn.usage?.outputTokens ?? 0;
			if (turn.content) finalText = turn.content;
		},
		addAssistantMessage(
			content: string,
			toolCalls: ToolCall[],
			providerItems: MessageContentBlock[] = []
		): void {
			const contentBlocks: MessageContentBlock[] = [...providerItems];
			if (content || contentBlocks.length === 0) {
				contentBlocks.push({ type: 'text', text: content });
			}
			messages.push({
				role: 'assistant',
				content: contentBlocks,
				...(toolCalls.length > 0 ? { toolCalls } : {}),
			});
			persist();
		},
		addToolResults(calls: ToolCall[]): void {
			toolCalls.push(...calls);
			numTurns += 1;
			persist();
		},
		toResult(subtype: SessionResult['subtype']): SessionResult {
			return {
				text: subtype === 'success' ? finalText : '',
				model,
				toolCalls,
				numTurns,
				subtype,
				sessionId: id,
				stopReason: subtype === 'success' ? (stopReason ?? 'end_turn') : stopReason,
				usage,
			};
		},
	};

	const self = {
		get id() {
			return id;
		},
		set id(value: string) {
			id = value;
		},
		get messages() {
			return messages;
		},
		set messages(value: Message[]) {
			messages = value;
		},
		toolCalls,
		usage,
		get maxTurns() {
			return maxTurns;
		},
		set maxTurns(value: number) {
			maxTurns = value;
		},
		get model() {
			return model;
		},
		set model(value: string) {
			model = value;
		},
		get numTurns() {
			return numTurns;
		},
		set numTurns(value: number) {
			numTurns = value;
		},
		get finalText() {
			return finalText;
		},
		set finalText(value: string) {
			finalText = value;
		},
		get stopReason() {
			return stopReason;
		},
		set stopReason(value: string | undefined) {
			stopReason = value;
		},
		get isExhausted() {
			return numTurns >= maxTurns;
		},
		init(input: SessionInput, category: SessionCategory = DEFAULT_CATEGORY): Session {
			id = resolveSessionId(input.sessionId, category, config.location);
			folderName = sessionFolderName(id);
			sessionsPath = sessionsRoot(config.location, category);
			const storedMessages = loadMessagesBySessionId(id, category, config.location);
			const legacyMessages =
				input.sessionId && input.sessionId !== id && storedMessages.length === 0
					? loadMessagesBySessionId(input.sessionId, category, config.location)
					: [];
			messages = [
				...(storedMessages.length > 0 ? storedMessages : legacyMessages),
				...(input.messages ?? []),
			];
			if (input.message) messages.push({ role: 'user', content: input.message });
			model = input.model ?? 'default';
			maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
			persist();
			return self;
		},
		loadMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): Message[] {
			const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
			return loadMessagesBySessionId(resolvedSessionId, category, config.location);
		},
		clearMessages(sessionId: string, category: SessionCategory = DEFAULT_CATEGORY): void {
			const resolvedSessionId = resolveStoredSessionId(sessionId, category, config.location);
			clearMessagesBySessionId(resolvedSessionId, category, config.location);
			if (id === resolvedSessionId) messages = [];
		},
		appendRun(entry: unknown): void {
			ensureSession();
			appendFileSync(runFilePath(), `${stringifyRunEntry(entry)}\n`, 'utf8');
		},
		recordTurn(turn: SessionTurn): void {
			model = turn.model;
			stopReason = turn.stopReason;
			usage.inputTokens += turn.usage?.inputTokens ?? 0;
			usage.outputTokens += turn.usage?.outputTokens ?? 0;
			if (turn.content) finalText = turn.content;
		},
		addAssistantMessage(
			content: string,
			toolCalls: ToolCall[],
			providerItems: MessageContentBlock[] = []
		): void {
			const contentBlocks: MessageContentBlock[] = [...providerItems];
			if (content || contentBlocks.length === 0) {
				contentBlocks.push({ type: 'text', text: content });
			}
			messages.push({
				role: 'assistant',
				content: contentBlocks,
				...(toolCalls.length > 0 ? { toolCalls } : {}),
			});
			persist();
		},
		addToolResults(calls: ToolCall[]): void {
			toolCalls.push(...calls);
			numTurns += 1;
			persist();
		},
		toResult(subtype: SessionResult['subtype']): SessionResult {
			return {
				text: subtype === 'success' ? finalText : '',
				model,
				toolCalls,
				numTurns,
				subtype,
				sessionId: id,
				stopReason: subtype === 'success' ? (stopReason ?? 'end_turn') : stopReason,
				usage,
			};
		},
	} satisfies Session;

	return self;
}

function loadMessagesBySessionId(
	sessionId: string,
	category: SessionCategory,
	location?: string
): Message[] {
	if (!location) return [];
	const root = sessionsRoot(location, category);
	const filePath = existsSync(messagesFile(root, sessionId))
		? messagesFile(root, sessionId)
		: legacyFilePath(root, sessionId);
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
	const root = sessionsRoot(location, category);
	const filePath = existsSync(messagesFile(root, sessionId))
		? messagesFile(root, sessionId)
		: legacyFilePath(root, sessionId);
	if (!existsSync(filePath)) return;
	writeFileSync(filePath, '[]\n', 'utf8');

	const runPath = path.join(
		sessionPath(root, sessionFolderName(sessionId)),
		'run.jsonl'
	);
	if (existsSync(runPath)) writeFileSync(runPath, '', 'utf8');
}

function sessionsRoot(location: string, category: SessionCategory): string {
	return path.join(path.resolve(location), 'sessions', category);
}

function sessionPath(sessionsPath: string, folder: string): string {
	return path.join(sessionsPath, folder);
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

function messagesFile(sessionsPath: string, sessionId: string): string {
	return path.join(
		sessionPath(sessionsPath, sessionFolderName(sessionId)),
		'messages.json'
	);
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
