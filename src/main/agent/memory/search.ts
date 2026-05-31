import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { listSessions, type SessionFile } from '../session/store';
import { DEFAULT_MAX_CHARS, DEFAULT_MAX_RESULTS, DEFAULT_MIN_SCORE, DEFAULT_READ_LINES, MAX_READ_CHARS, MAX_READ_LINES, MAX_RESULTS, MEMORY_CHUNK_LINES, MEMORY_CHUNK_OVERLAP, STOP_WORDS } from './constants';
import type { IndexedChunk, MemoryReadResult, MemorySearchManager, MemorySearchResult, MemorySource, SessionVisibility, WorkspaceMemorySearchManagerOptions } from './contracts';
import { listMemoryFiles, resolveAllowedMemoryFile } from './paths';
import { sanitizeTranscriptForMemory } from './transcript';

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
		const chunks: IndexedChunk[] = [];
		if (sources.includes('memory')) chunks.push(...(await this.indexMemoryFiles()));
		if (sources.includes('sessions') && this.includeSessions) {
			chunks.push(...(await this.indexSessionFiles(options.sessionKey)));
		}

		const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
		const maxResults = Math.min(Math.max(options.maxResults ?? DEFAULT_MAX_RESULTS, 1), MAX_RESULTS);
		return chunks
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

function chunkMarkdown(file: string, raw: string, workspaceDir: string): IndexedChunk[] {
	const lines = raw.split(/\r?\n/);
	const chunks: IndexedChunk[] = [];
	for (let start = 0; start < lines.length; start += MEMORY_CHUNK_LINES - MEMORY_CHUNK_OVERLAP) {
		const slice = lines.slice(start, start + MEMORY_CHUNK_LINES);
		const text = slice.join('\n').trim();
		if (!text) continue;
		const lineStart = start + 1;
		const lineEnd = start + slice.length;
		chunks.push({
			source: 'memory',
			path: file,
			chunkId: `memory:${path.relative(workspaceDir, file)}:${lineStart}`,
			text,
			lineStart,
			lineEnd,
			metadata: {
				relativePath: path.relative(workspaceDir, file),
				hash: createHash('sha1').update(text).digest('hex').slice(0, 12),
			},
		});
		if (start + MEMORY_CHUNK_LINES >= lines.length) break;
	}
	return chunks;
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
