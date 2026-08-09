import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';

export function toolPathDir(args: Record<string, unknown>, baseDir: string): string | undefined {
	const raw = args.path;
	if (typeof raw === 'string' && raw.length > 0)
		return path.dirname(realPath(resolveUserPath(raw, baseDir)));
	const workdir = args.workdir;
	if (typeof workdir === 'string' && workdir.length > 0) return resolveUserPath(workdir, baseDir);
	return undefined;
}

export function isPathWithin(parent: string, child: string): boolean {
	const rel = path.relative(parent, child);
	return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
