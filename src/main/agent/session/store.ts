import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadSessionIndex, saveSessionIndex, updateSessionIndex } from './index';
import { acquireWriteLock } from './lock';
import { defaultBaseDir, isSessionDataFile, sessionPath } from './paths';
import { sanitizeToolUseResultPairing } from './repair';
import { normalizeLoadedSession, sanitizeTranscriptForStorage } from './transcript';
import type { SessionFile, SessionStoreOptions } from './types';

export * from './transcript';
export * from './types';

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

export async function clearSession(id: string, opts: SessionStoreOptions = {}): Promise<void> {
	const baseDir = opts.baseDir ?? defaultBaseDir();
	try {
		await fs.unlink(sessionPath(baseDir, id));
	} catch {
		/* already gone */
	}
	const existing = await loadSessionIndex(baseDir);
	await saveSessionIndex(
		baseDir,
		existing.filter((entry) => entry.id !== id)
	);
}
