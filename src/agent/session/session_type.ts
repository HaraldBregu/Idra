import { readFileSync } from 'node:fs';
import type { SessionCategory } from './types';
import { DEFAULT_CATEGORY } from './types';
import { infoFile } from './info_file';

export function sessionType(sessionsPath: string, sessionId: string): SessionCategory {
	try {
		const info = JSON.parse(readFileSync(infoFile(sessionsPath, sessionId), 'utf8')) as {
			type?: unknown;
		};
		const type = info?.type;
		return type === 'main' || type === 'task' || type === 'health' || type === 'bot'
			? type
			: DEFAULT_CATEGORY;
	} catch {
		return DEFAULT_CATEGORY;
	}
}
