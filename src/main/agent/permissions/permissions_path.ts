import path from 'node:path';

export function isPathWithin(parent: string, child: string): boolean {
	const rel = path.relative(parent, child);
	return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
