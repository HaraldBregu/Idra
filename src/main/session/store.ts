import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { TranscriptEntry } from '../provider/types';
import type { PlanEntry } from '../tools/types';
import { resolveDefaultUserDataPath } from '../user-data';
import { acquireWriteLock } from './lock';
import { sanitizeToolUseResultPairing } from './repair';

export interface CompactionMarker {
	atTurn: number;
	droppedCount: number;
	summaryHash: string;
}

export type SessionStatus = 'active' | 'idle' | 'waiting' | 'completed' | 'failed' | 'cancelled';

export interface SessionFile {
	id: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider: string;
	sessionFile?: string;
	status?: SessionStatus;
	task?: string;
	parentSessionId?: string;
	spawnedBySessionId?: string;
	labels?: string[];
	modelOverride?: string;
	memoryFlushAt?: string;
	memoryFlushCompactionCount?: number;
	memoryFlushContextHash?: string;
	transcript: TranscriptEntry[];
	plan: PlanEntry[];
	compactionMarkers: CompactionMarker[];
}

export interface SessionIndexEntry {
	id: string;
	sessionFile: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider: string;
	status?: SessionStatus;
	task?: string;
	parentSessionId?: string;
	spawnedBySessionId?: string;
	labels?: string[];
	modelOverride?: string;
	memoryFlushAt?: string;
	memoryFlushCompactionCount?: number;
	memoryFlushContextHash?: string;
}

export interface SessionStoreOptions {
	baseDir?: string;
}

const MAX_TOOL_RESULT_CHARS = 16_000;

function defaultBaseDir(): string {
	return resolveDefaultUserDataPath('agent', 'sessions');
}

function sessionPath(baseDir: string, id: string): string {
	return path.join(baseDir, `${id}.json`);
}

function sessionIndexPath(baseDir: string): string {
	return path.join(baseDir, 'sessions.json');
}

function isSessionDataFile(name: string): boolean {
	return name.endsWith('.json') && name !== 'sessions.json' && !name.endsWith('.tmp') && !name.endsWith('.lock');
}

function normalizeLoadedSession(parsed: SessionFile, file: string): SessionFile {
	parsed.sessionFile = parsed.sessionFile ?? file;
	parsed.transcript = sanitizeTranscriptForStorage(sanitizeToolUseResultPairing(parsed.transcript ?? []));
	parsed.plan ??= [];
	parsed.compactionMarkers ??= [];
	return parsed;
}

function truncateText(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}\n[truncated ${value.length - maxChars} chars]`;
}

export function sanitizeTranscriptForStorage(transcript: TranscriptEntry[]): TranscriptEntry[] {
	return transcript.map((entry) => {
		if (entry.role !== 'tool') return entry;
		return {
			...entry,
			content: entry.content.map((block) => {
				if (block.type === 'image') {
					return {
						type: 'text' as const,
						text: `[image result omitted${block.mimeType ? `: ${block.mimeType}` : ''}]`,
					};
				}
				return {
					type: 'text' as const,
					text: truncateText(block.text ?? '', MAX_TOOL_RESULT_CHARS),
				};
			}),
		};
	});
}

function toIndexEntry(file: SessionFile, baseDir: string): SessionIndexEntry {
	return {
		id: file.id,
		sessionFile: file.sessionFile ?? sessionPath(baseDir, file.id),
		createdAt: file.createdAt,
		updatedAt: file.updatedAt,
		model: file.model,
		provider: file.provider,
		status: file.status,
		task: file.task,
		parentSessionId: file.parentSessionId,
		spawnedBySessionId: file.spawnedBySessionId,
		labels: file.labels,
		modelOverride: file.modelOverride,
		memoryFlushAt: file.memoryFlushAt,
		memoryFlushCompactionCount: file.memoryFlushCompactionCount,
		memoryFlushContextHash: file.memoryFlushContextHash,
	};
}

async function loadSessionIndex(baseDir: string): Promise<SessionIndexEntry[]> {
	try {
		const raw = await fs.readFile(sessionIndexPath(baseDir), 'utf8');
		const parsed = JSON.parse(raw) as { sessions?: SessionIndexEntry[] } | SessionIndexEntry[];
		return Array.isArray(parsed) ? parsed : parsed.sessions ?? [];
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

async function saveSessionIndex(baseDir: string, sessions: SessionIndexEntry[]): Promise<void> {
	const target = sessionIndexPath(baseDir);
	const tmp = target + '.tmp';
	const ordered = [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	await fs.mkdir(baseDir, { recursive: true, mode: 0o700 });
	const lock = await acquireWriteLock(target);
	try {
		await fs.writeFile(tmp, JSON.stringify({ sessions: ordered }, null, 2), {
			encoding: 'utf8',
			mode: 0o600,
		});
		await fs.rename(tmp, target);
		if (process.platform !== 'win32') await fs.chmod(target, 0o600).catch(() => undefined);
	} finally {
		await lock.release();
	}
}

async function updateSessionIndex(file: SessionFile, baseDir: string): Promise<void> {
	const existing = await loadSessionIndex(baseDir);
	const entry = toIndexEntry(file, baseDir);
	const next = existing.filter((item) => item.id !== file.id);
	next.push(entry);
	await saveSessionIndex(baseDir, next);
}

export async function loadSession(
	id: string,
	model: string,
	provider: string,
	opts: SessionStoreOptions = {}
): Promise<SessionFile> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	const file = sessionPath(baseDir, id);
	try {
		const raw = await fs.readFile(file, 'utf8');
		const parsed = JSON.parse(raw) as SessionFile;
		return normalizeLoadedSession(parsed, file);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw new Error(`session load failed: ${(err as Error).message}`);
		}
		const now = new Date().toISOString();
		return {
			id,
			createdAt: now,
			updatedAt: now,
			model,
			provider,
			sessionFile: file,
			status: 'active',
			transcript: [],
			plan: [],
			compactionMarkers: [],
		};
	}
}

export async function loadExistingSession(
	id: string,
	opts: SessionStoreOptions = {}
): Promise<SessionFile | null> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	const file = sessionPath(baseDir, id);
	try {
		const raw = await fs.readFile(file, 'utf8');
		return normalizeLoadedSession(JSON.parse(raw) as SessionFile, file);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw new Error(`session load failed: ${(err as Error).message}`);
	}
}

export async function listSessions(opts: SessionStoreOptions = {}): Promise<SessionFile[]> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	let entries: string[];
	try {
		entries = await fs.readdir(baseDir);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}

	const sessions: SessionFile[] = [];
	for (const entry of entries.filter(isSessionDataFile)) {
		const id = path.basename(entry, '.json');
		const session = await loadExistingSession(id, { baseDir });
		if (session) sessions.push(session);
	}
	return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveSession(
	file: SessionFile,
	opts: SessionStoreOptions = {}
): Promise<void> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	const target = sessionPath(baseDir, file.id);
	const tmp = target + '.tmp';
	await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
	const lock = await acquireWriteLock(target);
	try {
		file.updatedAt = new Date().toISOString();
		file.sessionFile = target;
		file.status ??= 'active';
		file.transcript = sanitizeTranscriptForStorage(sanitizeToolUseResultPairing(file.transcript));
		await fs.writeFile(tmp, JSON.stringify(file, null, 2), {
			encoding: 'utf8',
			mode: 0o600,
		});
		await fs.rename(tmp, target);
		if (process.platform !== 'win32') await fs.chmod(target, 0o600).catch(() => undefined);
	} finally {
		await lock.release();
	}
	await updateSessionIndex(file, baseDir);
}

export async function clearSession(
	id: string,
	opts: SessionStoreOptions = {}
): Promise<void> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	try {
		await fs.unlink(sessionPath(baseDir, id));
	} catch {
		/* already gone */
	}
	const existing = await loadSessionIndex(baseDir);
	await saveSessionIndex(baseDir, existing.filter((entry) => entry.id !== id));
}
