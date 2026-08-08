import { containedSessionPath } from './session_contained_path';
import { isUuid } from './session_is_uuid';

export function sessionPath(sessionsPath: string, folder: string): string {
	if (!isUuid(folder)) throw new Error('Invalid assistant session id.');
	return containedSessionPath(sessionsPath, folder);
}
