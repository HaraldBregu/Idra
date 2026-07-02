import path from 'node:path';
import { safeName } from './session_safe_name';

export function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return path.join(sessionsPath, `${safeName(sessionId)}.json`);
}
