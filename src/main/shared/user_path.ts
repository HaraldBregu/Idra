import os from 'node:os';
import path from 'node:path';

export function resolveUserPath(raw: string, baseDir: string): string {
	if (raw === '~') return os.homedir();
	if (raw.startsWith('~/') || raw.startsWith('~\\'))
		return path.resolve(os.homedir(), raw.slice(2));
	return path.resolve(baseDir, raw);
}
