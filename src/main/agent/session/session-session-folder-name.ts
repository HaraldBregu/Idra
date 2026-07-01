import { safeName } from './session-safe-name';

export function sessionFolderName(sessionId: string): string {
	return safeName(sessionId);
}
