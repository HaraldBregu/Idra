import { lstatSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import { realPath } from '../../shared/real_path';

export function containedSessionPath(rootPath: string, ...segments: string[]): string {
	const root = realPath(rootPath);
	const candidate = path.join(root, ...segments);
	let resolvedCandidate = realPath(candidate);
	try {
		if (lstatSync(candidate).isSymbolicLink()) {
			resolvedCandidate = realPath(path.resolve(path.dirname(candidate), readlinkSync(candidate)));
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
	const relative = path.relative(root, resolvedCandidate);
	if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('Session path escapes the sessions directory.');
	}
	return candidate;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function safeName(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'session';
}

export function sessionFolderName(sessionId: string): string {
	return safeName(sessionId);
}

export function sessionPath(sessionsPath: string, folder: string, ...segments: string[]): string {
	if (!isUuid(folder)) throw new Error('Invalid assistant session id.');
	return containedSessionPath(sessionsPath, folder, ...segments);
}

export function sessionsRoot(location: string): string {
	return path.join(path.dirname(path.resolve(location)), 'sessions');
}
