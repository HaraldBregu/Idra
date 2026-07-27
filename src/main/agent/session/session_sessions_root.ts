import path from 'node:path';

export function sessionsRoot(location: string): string {
	return `${path.resolve(location)}_sessions`;
}
