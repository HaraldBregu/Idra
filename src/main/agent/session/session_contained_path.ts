import path from 'node:path';
import { realPath } from '../../shared/real_path';

export function containedSessionPath(rootPath: string, ...segments: string[]): string {
	const root = realPath(rootPath);
	const candidate = path.join(root, ...segments);
	const relative = path.relative(root, realPath(candidate));
	if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('Session path escapes the sessions directory.');
	}
	return candidate;
}
