import { containedSessionPath, safeName } from './common';

export function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return containedSessionPath(sessionsPath, `${safeName(sessionId)}.json`);
}
