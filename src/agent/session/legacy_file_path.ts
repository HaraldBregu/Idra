import { containedSessionPath } from './contained_session_path';
import { safeName } from './safe_name';

export function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return containedSessionPath(sessionsPath, `${safeName(sessionId)}.json`);
}
