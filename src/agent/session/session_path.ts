import { containedSessionPath } from './contained_session_path';
import { isUuid } from './is_uuid';

export function sessionPath(sessionsPath: string, folder: string, ...segments: string[]): string {
	if (!isUuid(folder)) throw new Error('Invalid assistant session id.');
	return containedSessionPath(sessionsPath, folder, ...segments);
}
