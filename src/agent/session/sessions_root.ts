import path from 'node:path';

export function sessionsRoot(location: string): string {
	return path.join(path.dirname(path.resolve(location)), 'sessions');
}
