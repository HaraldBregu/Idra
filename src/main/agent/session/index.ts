import { promises as fs } from 'node:fs';
import { acquireWriteLock } from './lock';
import { sessionIndexPath, sessionPath } from './paths';
import type { SessionFile, SessionIndexEntry } from './types';

function toIndexEntry(file: SessionFile, baseDir: string): SessionIndexEntry {
	return {
		id: file.id,
		sessionFile: file.sessionFile ?? sessionPath(baseDir, file.id),
		createdAt: file.createdAt,
		updatedAt: file.updatedAt,
		model: file.model,
		provider: file.provider,
		status: file.status,
		agentId: file.agentId,
		agentMetadata: file.agentMetadata,
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

export async function loadSessionIndex(baseDir: string): Promise<SessionIndexEntry[]> {
	try {
		const raw = await fs.readFile(sessionIndexPath(baseDir), 'utf8');
		const parsed = JSON.parse(raw) as { sessions?: SessionIndexEntry[] } | SessionIndexEntry[];
		return Array.isArray(parsed) ? parsed : (parsed.sessions ?? []);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

export async function saveSessionIndex(baseDir: string, sessions: SessionIndexEntry[]): Promise<void> {
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

export async function updateSessionIndex(file: SessionFile, baseDir: string): Promise<void> {
	const existing = await loadSessionIndex(baseDir);
	const entry = toIndexEntry(file, baseDir);
	const next = existing.filter((item) => item.id !== file.id);
	next.push(entry);
	await saveSessionIndex(baseDir, next);
}
