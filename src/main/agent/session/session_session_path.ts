import path from 'node:path';

export function sessionPath(sessionsPath: string, folder: string): string {
	return path.join(sessionsPath, folder);
}
