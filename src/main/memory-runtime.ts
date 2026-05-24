import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	describeChatMemoryFile,
	resolveChatDailyMemoryTarget,
	validateChatDailyMemoryRelativePath,
	type ChatMemoryScope,
	type ChatMemoryScopeInput,
	type ChatMemoryScopeKind,
} from './memory';
import type { TranscriptEntry } from './provider/types';
import { describeRagFile } from './rag';
import { acquireWriteLock } from './session/lock';
import { listSessions, type SessionFile } from './session/store';
import { describeWikiFile } from './wiki';

export type MemorySource = 'memory' | 'sessions';
export type MemoryCorpus = 'memory' | 'sessions' | 'rag' | 'wiki' | 'all';
export type MemoryFileCorpus = Exclude<MemoryCorpus, 'sessions' | 'all'>;
export type MemoryResultCorpus = Exclude<MemoryCorpus, 'all'>;
export type MemoryScopeKind = ChatMemoryScopeKind;
export type MemoryScope = ChatMemoryScope;
export type MemoryScopeInput = ChatMemoryScopeInput;
export type SessionVisibility = 'self' | 'tree' | 'agent' | 'all';

export interface MemorySearchResult {
	source: MemorySource;
	corpus: MemoryResultCorpus;
	path: string;
	chunkId: string;
	text: string;
	score: number;
	lineStart?: number;
	lineEnd?: number;
	scopeKind?: MemoryScopeKind;
	scopeId?: string;
	sessionId?: string;
	metadata?: Record<string, unknown>;
}

export interface MemoryReadResult {
	path: string;
	from: number;
	lines: number;
	text: string;
	truncated: boolean;
	nextFrom?: number;
	maxChars: number;
	lineCount: number;
}

export interface MemorySearchManager {
	search(query: string, options?: {
		maxResults?: number;
		minScore?: number;
		source?: MemorySource;
		sources?: MemorySource[];
		corpus?: MemoryCorpus;
		corpora?: MemoryCorpus[];
		scopeKind?: MemoryScopeKind;
		scopeId?: string;
		sessionKey?: string;
	}): Promise<MemorySearchResult[]>;

	readFile(path: string, options?: {
		from?: number;
		lines?: number;
		maxChars?: number;
	}): Promise<MemoryReadResult>;

	status(): Promise<Record<string, unknown>>;
	warmSession?(): Promise<void>;
	close?(): Promise<void>;
}

export interface WorkspaceMemorySearchManagerOptions {
	workspaceDir: string;
	sessionBaseDir?: string;
	enabled?: boolean;
	includeSessions?: boolean;
	extraPaths?: string[];
	sessionVisibility?: SessionVisibility;
	currentSessionId?: string;
}

export interface MemoryFlushPlan {
	targetPath: string;
	relativePath: string;
	prompt: string;
	workspaceDir?: string;
	corpus?: MemoryFileCorpus;
	scope?: MemoryScope;
}

type IndexedChunk = {
	source: MemorySource;
	corpus: MemoryResultCorpus;
	path: string;
	chunkId: string;
	text: string;
	lineStart?: number;
	lineEnd?: number;
	scopeKind?: MemoryScopeKind;
	scopeId?: string;
	sessionId?: string;
	metadata?: Record<string, unknown>;
};

const MEMORY_FILENAME = 'MEMORY.md';
const MEMORY_DIRNAME = 'memory';
const DEFAULT_MAX_RESULTS = 8;
const MAX_RESULTS = 25;
const DEFAULT_MIN_SCORE = 0.1;
const DEFAULT_READ_LINES = 120;
const MAX_READ_LINES = 500;
const DEFAULT_MAX_CHARS = 16_000;
const MAX_READ_CHARS = 64_000;
const MEMORY_CHUNK_LINES = 80;
const MEMORY_CHUNK_OVERLAP = 10;
const SESSION_TOOL_RESULT_CHARS = 2_000;
const STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'by',
	'for',
	'from',
	'in',
	'is',
	'it',
	'of',
	'on',
	'or',
	'that',
	'the',
	'this',
	'to',
	'with',
]);

export class WorkspaceMemorySearchManager implements MemorySearchManager {
	private readonly workspaceDir: string;
	private readonly sessionBaseDir?: string;
	private readonly enabled: boolean;
	private readonly includeSessions: boolean;
	private readonly extraPaths: string[];
	private readonly sessionVisibility: SessionVisibility;
	private readonly currentSessionId?: string;

	constructor(options: WorkspaceMemorySearchManagerOptions) {
		this.workspaceDir = path.resolve(options.workspaceDir);
		this.sessionBaseDir = options.sessionBaseDir;
		this.enabled = options.enabled ?? true;
		this.includeSessions = options.includeSessions ?? true;
		this.extraPaths = options.extraPaths ?? [];
		this.sessionVisibility = options.sessionVisibility ?? 'agent';
		this.currentSessionId = options.currentSessionId;
	}

	async search(query: string, options: Parameters<MemorySearchManager['search']>[1] = {}): Promise<MemorySearchResult[]> {
		if (!this.enabled) return [];
		const trimmed = query.trim();
		if (!trimmed) return [];

		const sources = this.resolveSources(options);
		const corpora = resolveRequestedCorpora(options);
		const chunks: IndexedChunk[] = [];
		if (sources.includes('memory') && corpora.some((corpus) => corpus !== 'sessions')) {
			chunks.push(...(await this.indexMemoryFiles()));
		}
		if (sources.includes('sessions') && corpora.includes('sessions') && this.includeSessions) {
			chunks.push(...(await this.indexSessionFiles(options.sessionKey)));
		}

		const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
		const maxResults = Math.min(Math.max(options.maxResults ?? DEFAULT_MAX_RESULTS, 1), MAX_RESULTS);
		return chunks
			.filter((chunk) => matchesMemorySearchFilter(chunk, corpora, options.scopeKind, options.scopeId))
			.map((chunk) => ({ chunk, score: keywordScore(trimmed, chunk.text) }))
			.filter(({ score }) => score >= minScore)
			.sort((a, b) => b.score - a.score)
			.slice(0, maxResults)
			.map(({ chunk, score }) => ({ ...chunk, score }));
	}

	async readFile(requestedPath: string, options: Parameters<MemorySearchManager['readFile']>[1] = {}): Promise<MemoryReadResult> {
		if (!this.enabled) throw new Error('Memory search is disabled.');
		const absolutePath = await resolveAllowedMemoryFile(this.workspaceDir, requestedPath, this.extraPaths);
		const raw = await fs.readFile(absolutePath, 'utf8');
		const allLines = raw.split(/\r?\n/);
		const from = Math.max(1, Math.floor(options.from ?? 1));
		const lines = Math.min(Math.max(Math.floor(options.lines ?? DEFAULT_READ_LINES), 1), MAX_READ_LINES);
		const maxChars = Math.min(Math.max(Math.floor(options.maxChars ?? DEFAULT_MAX_CHARS), 1), MAX_READ_CHARS);
		const selected = allLines.slice(from - 1, from - 1 + lines);
		const output: string[] = [];
		let usedChars = 0;
		let charTruncated = false;

		for (let i = 0; i < selected.length; i++) {
			const line = `${String(from + i).padStart(6, ' ')}\t${selected[i] ?? ''}`;
			const needed = line.length + (output.length > 0 ? 1 : 0);
			if (usedChars + needed > maxChars) {
				charTruncated = true;
				break;
			}
			output.push(line);
			usedChars += needed;
		}

		const consumedLines = output.length;
		const hasMoreLines = from - 1 + consumedLines < allLines.length;
		return {
			path: absolutePath,
			from,
			lines: consumedLines,
			text: output.join('\n'),
			truncated: charTruncated || hasMoreLines,
			nextFrom: charTruncated || hasMoreLines ? from + consumedLines : undefined,
			maxChars,
			lineCount: allLines.length,
		};
	}

	async status(): Promise<Record<string, unknown>> {
		return {
			enabled: this.enabled,
			workspaceDir: this.workspaceDir,
			includeSessions: this.includeSessions,
			sessionBaseDir: this.sessionBaseDir,
			sessionVisibility: this.sessionVisibility,
			extraPaths: this.extraPaths,
		};
	}

	private resolveSources(options: Parameters<MemorySearchManager['search']>[1] = {}): MemorySource[] {
		const requested = options.sources ?? (options.source ? [options.source] : (['memory', 'sessions'] as MemorySource[]));
		const unique = [...new Set(requested)];
		return unique.filter((source) => source === 'memory' || source === 'sessions');
	}

	private async indexMemoryFiles(): Promise<IndexedChunk[]> {
		const files = await listMemoryFiles(this.workspaceDir, this.extraPaths);
		const chunks: IndexedChunk[] = [];
		for (const file of files) {
			const raw = await fs.readFile(file, 'utf8');
			chunks.push(...chunkMarkdown(file, raw, this.workspaceDir));
		}
		return chunks;
	}

	private async indexSessionFiles(sessionKey?: string): Promise<IndexedChunk[]> {
		const sessions = await listSessions({ baseDir: this.sessionBaseDir });
		const chunks: IndexedChunk[] = [];
		for (const session of sessions) {
			if (!canAccessSession(this.currentSessionId, session, this.sessionVisibility)) continue;
			if (sessionKey && session.id !== sessionKey) continue;
			const messages = sanitizeTranscriptForMemory(session.transcript);
			for (const message of messages) {
				chunks.push({
					source: 'sessions',
					corpus: 'sessions',
					path: session.sessionFile ?? session.id,
					chunkId: `session:${session.id}:${message.index}`,
					text: message.text,
					lineStart: message.index + 1,
					lineEnd: message.index + 1,
					sessionId: session.id,
					metadata: {
						role: message.role,
						updatedAt: session.updatedAt,
						status: session.status,
					},
				});
			}
		}
		return chunks;
	}
}

export function canAccessSession(
	requesterSessionId: string | undefined,
	target: Pick<SessionFile, 'id' | 'parentSessionId' | 'spawnedBySessionId'>,
	visibility: SessionVisibility = 'agent'
): boolean {
	if (!requesterSessionId || target.id === requesterSessionId) return true;
	if (visibility === 'self') return false;
	if (visibility === 'tree') {
		return target.parentSessionId === requesterSessionId || target.spawnedBySessionId === requesterSessionId;
	}
	return visibility === 'agent' || visibility === 'all';
}

export function sanitizeTranscriptForMemory(transcript: TranscriptEntry[]): Array<{
	index: number;
	role: TranscriptEntry['role'];
	text: string;
}> {
	return transcript.map((entry, index) => ({
		index,
		role: entry.role,
		text: renderTranscriptEntry(entry),
	}));
}

export function resolveMemoryFlushPlan(
	workspaceDir: string,
	clock: () => Date = () => new Date(),
	scope?: MemoryScopeInput
): MemoryFlushPlan {
	const date = toLocalDate(clock());
	const target = resolveChatDailyMemoryTarget(workspaceDir, scope, date);
	return {
		targetPath: target.targetPath,
		relativePath: target.relativePath,
		workspaceDir: path.resolve(workspaceDir),
		corpus: 'memory',
		scope: target.scope,
		prompt: `Append durable facts, decisions, TODOs, and user preferences from the current session to ${target.relativePath}.`,
	};
}

export async function appendOnlyMemoryFlush(plan: MemoryFlushPlan, content: string): Promise<void> {
	const target = path.resolve(plan.targetPath);
	validateChatDailyMemoryRelativePath(plan.relativePath);
	const workspace = path.resolve(plan.workspaceDir ?? deriveWorkspaceFromRelativeTarget(target, plan.relativePath));
	if (path.resolve(workspace, plan.relativePath) !== target) {
		throw new Error('Memory flush target must match the planned daily memory file.');
	}
	const descriptor = describeWorkspaceMemoryFile(workspace, target);
	if (!descriptor || descriptor.corpus !== 'memory') {
		throw new Error('Memory flush target must be memory/YYYY-MM-DD.md or memory/chats/<chatScope>/YYYY-MM-DD.md.');
	}
	const memoryDir = path.dirname(target);
	await fs.mkdir(memoryDir, { recursive: true, mode: 0o700 });
	const lock = await acquireWriteLock(target);
	try {
		const body = content.endsWith('\n') ? content : `${content}\n`;
		await fs.appendFile(target, body, { encoding: 'utf8', mode: 0o600 });
		if (process.platform !== 'win32') await fs.chmod(target, 0o600).catch(() => undefined);
	} finally {
		await lock.release();
	}
}

export async function flushSessionMemoryBeforeCompaction(
	session: SessionFile,
	workspaceDir: string,
	options: {
		clock?: () => Date;
		minTranscriptBytes?: number;
		scope?: MemoryScopeInput;
	} = {}
): Promise<{ status: 'skipped' | 'flushed'; targetPath?: string; reason?: string }> {
	const rendered = sanitizeTranscriptForMemory(session.transcript)
		.map((entry) => `${entry.role.toUpperCase()}: ${entry.text}`)
		.join('\n');
	const bytes = Buffer.byteLength(rendered, 'utf8');
	if (bytes < (options.minTranscriptBytes ?? 0)) return { status: 'skipped', reason: 'below_threshold' };

	const contextHash = createHash('sha1').update(rendered).digest('hex').slice(0, 12);
	if (session.memoryFlushContextHash === contextHash) return { status: 'skipped', reason: 'already_flushed' };

	const plan = resolveMemoryFlushPlan(workspaceDir, options.clock, options.scope);
	const now = (options.clock ?? (() => new Date()))().toISOString();
	const content = [
		`## Session ${session.id} pre-compaction ${now}`,
		'',
		rendered || 'No transcript content available.',
		'',
	].join('\n');
	await appendOnlyMemoryFlush(plan, content);
	session.memoryFlushAt = now;
	session.memoryFlushCompactionCount = session.compactionMarkers.length;
	session.memoryFlushContextHash = contextHash;
	return { status: 'flushed', targetPath: plan.targetPath };
}

async function listMemoryFiles(workspaceDir: string, extraPaths: string[]): Promise<string[]> {
	const files: string[] = [];
	await pushIfAllowed(files, path.join(workspaceDir, MEMORY_FILENAME), workspaceDir, extraPaths);
	await walkMemoryDir(files, path.join(workspaceDir, MEMORY_DIRNAME), workspaceDir, extraPaths);
	for (const extraPath of extraPaths) {
		const absolute = path.isAbsolute(extraPath) ? path.resolve(extraPath) : path.resolve(workspaceDir, extraPath);
		await walkExtraPath(files, absolute, workspaceDir, extraPaths);
	}
	return [...new Set(files)];
}

async function walkMemoryDir(files: string[], dir: string, workspaceDir: string, extraPaths: string[]): Promise<void> {
	let entries: string[];
	try {
		entries = await fs.readdir(dir);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw err;
	}
	for (const entry of entries) {
		const absolute = path.join(dir, entry);
		const stat = await fs.lstat(absolute);
		if (stat.isDirectory()) {
			await walkMemoryDir(files, absolute, workspaceDir, extraPaths);
		} else {
			await pushIfAllowed(files, absolute, workspaceDir, extraPaths);
		}
	}
}

async function walkExtraPath(files: string[], absolute: string, workspaceDir: string, extraPaths: string[]): Promise<void> {
	let stat;
	try {
		stat = await fs.lstat(absolute);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw err;
	}
	if (stat.isDirectory()) {
		const entries = await fs.readdir(absolute);
		for (const entry of entries) {
			await walkExtraPath(files, path.join(absolute, entry), workspaceDir, extraPaths);
		}
		return;
	}
	await pushIfAllowed(files, absolute, workspaceDir, extraPaths);
}

async function pushIfAllowed(files: string[], absolute: string, workspaceDir: string, extraPaths: string[]): Promise<void> {
	try {
		const allowed = await resolveAllowedMemoryFile(workspaceDir, absolute, extraPaths);
		files.push(allowed);
	} catch {
		return;
	}
}

async function resolveAllowedMemoryFile(workspaceDir: string, requestedPath: string, extraPaths: string[]): Promise<string> {
	const workspace = path.resolve(workspaceDir);
	const absolute = path.isAbsolute(requestedPath) ? path.resolve(requestedPath) : path.resolve(workspace, requestedPath);
	const stat = await fs.stat(absolute);
	if (!stat.isFile()) throw new Error('Memory path is not a file.');
	if (path.extname(absolute).toLowerCase() !== '.md') throw new Error('Memory path must be Markdown.');

	const workspaceReal = await fs.realpath(workspace).catch(() => workspace);
	const memoryRootReal = await fs.realpath(path.join(workspace, MEMORY_DIRNAME)).catch(() =>
		path.join(workspaceReal, MEMORY_DIRNAME)
	);
	const real = await fs.realpath(absolute);
	const rootMemory = absolute === path.join(workspace, MEMORY_FILENAME);
	const memoryRelative = path.relative(path.join(workspace, MEMORY_DIRNAME), absolute);
	const underMemoryDir = memoryRelative !== '' && !memoryRelative.startsWith('..') && !path.isAbsolute(memoryRelative);
	const underWorkspaceReal = isInside(workspaceReal, real);
	const underMemoryReal = isInside(memoryRootReal, real);
	const extraAllowed = await isAllowedExtraPath(real, workspace, extraPaths);

	if (rootMemory && underWorkspaceReal) return absolute;
	if (underMemoryDir && underMemoryReal) return absolute;
	if (extraAllowed) return real;
	throw new Error('Memory path is outside allowed memory roots.');
}

async function isAllowedExtraPath(real: string, workspace: string, extraPaths: string[]): Promise<boolean> {
	for (const extraPath of extraPaths) {
		const absolute = path.isAbsolute(extraPath) ? path.resolve(extraPath) : path.resolve(workspace, extraPath);
		const extraReal = await fs.realpath(absolute).catch(() => absolute);
		if (real === extraReal || isInside(extraReal, real)) return true;
	}
	return false;
}

function chunkMarkdown(file: string, raw: string, workspaceDir: string): IndexedChunk[] {
	const lines = raw.split(/\r?\n/);
	const chunks: IndexedChunk[] = [];
	const descriptor = describeMemoryFile(workspaceDir, file) ?? {
		corpus: 'memory' as const,
		scopeKind: 'global' as const,
		scopeId: 'global',
		relativePath: path.relative(workspaceDir, file),
	};
	for (let start = 0; start < lines.length; start += MEMORY_CHUNK_LINES - MEMORY_CHUNK_OVERLAP) {
		const slice = lines.slice(start, start + MEMORY_CHUNK_LINES);
		const text = slice.join('\n').trim();
		if (!text) continue;
		const lineStart = start + 1;
		const lineEnd = start + slice.length;
		chunks.push({
			source: 'memory',
			corpus: descriptor.corpus,
			path: file,
			chunkId: `${descriptor.corpus}:${descriptor.relativePath}:${lineStart}`,
			text,
			lineStart,
			lineEnd,
			scopeKind: descriptor.scopeKind,
			scopeId: descriptor.scopeId,
			metadata: {
				relativePath: descriptor.relativePath,
				corpus: descriptor.corpus,
				scopeKind: descriptor.scopeKind,
				scopeId: descriptor.scopeId,
				hash: createHash('sha1').update(text).digest('hex').slice(0, 12),
			},
		});
		if (start + MEMORY_CHUNK_LINES >= lines.length) break;
	}
	return chunks;
}

function resolveRequestedCorpora(options: Parameters<MemorySearchManager['search']>[1] = {}): MemoryResultCorpus[] {
	const requested = options.corpora ?? (options.corpus ? [options.corpus] : (['memory', 'sessions'] as MemoryCorpus[]));
	if (requested.includes('all')) return ['memory', 'sessions', 'rag', 'wiki'];
	const allowed = new Set<MemoryResultCorpus>(['memory', 'sessions', 'rag', 'wiki']);
	const unique = [...new Set(requested)].filter((corpus): corpus is MemoryResultCorpus =>
		allowed.has(corpus as MemoryResultCorpus)
	);
	return unique.length > 0 ? unique : ['memory', 'sessions'];
}

function deriveWorkspaceFromRelativeTarget(target: string, relativePath: string): string {
	let workspace = path.resolve(target);
	for (const _segment of relativePath.split(/[\\/]+/).filter(Boolean)) {
		workspace = path.dirname(workspace);
	}
	return workspace;
}

function renderTranscriptEntry(entry: TranscriptEntry): string {
	if (entry.role === 'user') return truncate(entry.content, DEFAULT_MAX_CHARS);
	if (entry.role === 'assistant') {
		return entry.content
			.map((block) => {
				if (block.type === 'text') return block.text;
				if (block.type === 'reasoning') return '';
				return `[tool_call ${block.toolName} ${truncate(JSON.stringify(block.toolArgs ?? {}), 500)}]`;
			})
			.join('\n')
			.trim();
	}
	return entry.content
		.map((block) => {
			if (block.type === 'image') return '[image result omitted]';
			return truncate(block.text ?? '', SESSION_TOOL_RESULT_CHARS);
		})
		.join('\n')
		.trim();
}

function keywordScore(query: string, text: string): number {
	const queryTokens = new Set(tokenize(query));
	if (queryTokens.size === 0) return 0;
	const textTokens = tokenize(text);
	if (textTokens.length === 0) return 0;
	const textSet = new Set(textTokens);
	let overlap = 0;
	for (const token of queryTokens) {
		if (textSet.has(token)) overlap++;
	}
	return overlap / queryTokens.size;
}

function tokenize(value: string): string[] {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.split(' ')
		.map((token) => token.trim())
		.filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function truncate(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)} [truncated ${value.length - maxChars} chars]`;
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function toLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
