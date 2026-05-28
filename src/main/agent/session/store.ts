import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDefaultAgentDataPath } from '../storage';
import type { TranscriptEntry } from '../../provider/types';

export type SessionStatus = 'active' | 'waiting' | 'completed' | 'failed' | 'cancelled';

export interface SessionFile {
	id: string;
	createdAt: string;
	updatedAt: string;
	model: string;
	provider?: string;
	status?: SessionStatus;
	transcript: TranscriptEntry[];
	plan: Array<{ task: string; status: 'pending' | 'in_progress' | 'done' }>;
	compactionMarkers: Array<Record<string, unknown>>;
	metadata?: Record<string, unknown>;
}

export interface SessionStoreOptions {
	baseDir?: string;
}

function sessionDir(options: SessionStoreOptions = {}): string {
	return options.baseDir ?? resolveDefaultAgentDataPath('sessions');
}

function sessionPath(id: string, options: SessionStoreOptions = {}): string {
	return path.join(sessionDir(options), `${id.replace(/[^a-zA-Z0-9._:-]/g, '_')}.json`);
}

export async function loadSession(
	id: string = randomUUID(),
	model = 'unknown',
	provider?: string,
	options: SessionStoreOptions = {}
): Promise<SessionFile> {
	const existing = await loadExistingSession(id, options);
	if (existing) return existing;
	const now = new Date().toISOString();
	const session: SessionFile = {
		id,
		createdAt: now,
		updatedAt: now,
		model,
		provider,
		status: 'active',
		transcript: [],
		plan: [],
		compactionMarkers: [],
	};
	await saveSession(session, options);
	return session;
}

export async function loadExistingSession(id: string, options: SessionStoreOptions = {}): Promise<SessionFile | null> {
	try {
		return JSON.parse(await fs.readFile(sessionPath(id, options), 'utf8')) as SessionFile;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}
}

export async function saveSession(session: SessionFile, options: SessionStoreOptions = {}): Promise<void> {
	await fs.mkdir(sessionDir(options), { recursive: true });
	await fs.writeFile(sessionPath(session.id, options), `${JSON.stringify({ ...session, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

export async function listSessions(options: SessionStoreOptions = {}): Promise<SessionFile[]> {
	const dir = sessionDir(options);
	const entries = await fs.readdir(dir).catch(() => []);
	const sessions = await Promise.all(entries.filter((entry) => entry.endsWith('.json')).map((entry) => fs.readFile(path.join(dir, entry), 'utf8').then((text) => JSON.parse(text) as SessionFile)));
	return sessions;
}

export async function clearSession(id: string, options: SessionStoreOptions = {}): Promise<void> {
	await fs.rm(sessionPath(id, options), { force: true });
}
