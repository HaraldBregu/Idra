import path from 'node:path';

export function goalFilePath(sessionDir: string): string {
	return path.join(sessionDir, 'goal.json');
}
