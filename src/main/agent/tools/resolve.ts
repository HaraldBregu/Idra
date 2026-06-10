import os from 'node:os';
import path from 'node:path';

export function resolveToolPath(basePath: string, targetPath: string): string {
	if (targetPath === '~') return os.homedir();
	if (targetPath.startsWith('~/') || targetPath.startsWith('~\\')) {
		return path.resolve(os.homedir(), targetPath.slice(2));
	}
	if (path.isAbsolute(targetPath) || path.win32.isAbsolute(targetPath)) {
		return path.normalize(targetPath);
	}
	return path.resolve(basePath, targetPath);
}
