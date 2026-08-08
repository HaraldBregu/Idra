import { containedSessionPath } from './session_contained_path';
import { safeName } from './session_safe_name';

export function legacyFilePath(sessionsPath: string, sessionId: string): string {
	return containedSessionPath(sessionsPath, `${safeName(sessionId)}.json`);
}
