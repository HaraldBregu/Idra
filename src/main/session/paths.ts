import path from 'node:path';
import { resolveDefaultAgentDataPath } from '../data-directory';

export function defaultBaseDir(): string {
	return resolveDefaultAgentDataPath('sessions');
}

export function sessionPath(baseDir: string, id: string): string {
	return path.join(baseDir, `${id}.json`);
}

export function sessionIndexPath(baseDir: string): string {
	return path.join(baseDir, 'sessions.json');
}

export function isSessionDataFile(name: string): boolean {
	return (
		name.endsWith('.json') &&
		name !== 'sessions.json' &&
		!name.endsWith('.tmp') &&
		!name.endsWith('.lock')
	);
}
