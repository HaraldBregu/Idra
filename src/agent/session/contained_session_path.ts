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
