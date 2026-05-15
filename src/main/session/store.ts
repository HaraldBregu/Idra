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

export interface SessionFile {
	id: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider: string;
	transcript: TranscriptEntry[];
	plan: PlanEntry[];
	compactionMarkers: CompactionMarker[];
}

export interface SessionStoreOptions {
	baseDir?: string;
}

function defaultBaseDir(): string {
	return resolveDefaultUserDataPath('assistant', 'sessions');
}

function sessionPath(baseDir: string, id: string): string {
	return path.join(baseDir, `${id}.json`);
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
		parsed.transcript = sanitizeToolUseResultPairing(parsed.transcript ?? []);
		parsed.plan ??= [];
		parsed.compactionMarkers ??= [];
		return parsed;
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
			transcript: [],
			plan: [],
			compactionMarkers: [],
		};
	}
}

export async function saveSession(
	file: SessionFile,
	opts: SessionStoreOptions = {}
): Promise<void> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	const target = sessionPath(baseDir, file.id);
	const tmp = target + '.tmp';
	await fs.mkdir(path.dirname(target), { recursive: true });
	const lock = await acquireWriteLock(target);
	try {
		file.updatedAt = new Date().toISOString();
		file.transcript = sanitizeToolUseResultPairing(file.transcript);
		await fs.writeFile(tmp, JSON.stringify(file, null, 2), 'utf8');
		await fs.rename(tmp, target);
	} finally {
		await lock.release();
	}
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
}
