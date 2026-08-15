import { safeName } from './safe_name';

export function sessionFolderName(sessionId: string): string {
	return safeName(sessionId);
}
