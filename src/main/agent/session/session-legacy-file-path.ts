import path from 'node:path';
import { safeName } from './session-safe-name';

export function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return path.join(sessionsPath, `${safeName(sessionId)}.json`);
}
