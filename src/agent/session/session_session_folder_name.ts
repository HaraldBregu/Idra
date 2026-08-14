import { safeName } from './session_safe_name';

export function sessionFolderName(sessionId: string): string {
	return safeName(sessionId);
}
