import os from 'node:os';
import path from 'node:path';

export function resolveUserPath(raw: string): string {
	if (raw === '~') return os.homedir();
	if (raw.startsWith('~/') || raw.startsWith('~\\'))
		return path.resolve(os.homedir(), raw.slice(2));
	return path.resolve(raw);
}

export function toolPathDir(args: Record<string, unknown>): string | undefined {
	const raw = args.path;
	if (typeof raw === 'string' && raw.length > 0) return path.dirname(resolveUserPath(raw));
	const workdir = args.workdir;
	if (typeof workdir === 'string' && workdir.length > 0) return resolveUserPath(workdir);
	return undefined;
}

export function isPathWithin(parent: string, child: string): boolean {
	const rel = path.relative(parent, child);
	return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
