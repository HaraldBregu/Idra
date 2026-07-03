import os from 'node:os';
import path from 'node:path';

export function toolPathDir(args: Record<string, unknown>): string | undefined {
	const raw = args.path;
	if (typeof raw !== 'string' || raw.length === 0) return undefined;
	let resolved: string;
	if (raw === '~') resolved = os.homedir();
	else if (raw.startsWith('~/') || raw.startsWith('~\\'))
		resolved = path.resolve(os.homedir(), raw.slice(2));
	else resolved = path.resolve(raw);
	return path.dirname(resolved);
}

export function isPathWithin(parent: string, child: string): boolean {
	const rel = path.relative(parent, child);
	return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
