import { IDENTITY_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readIdentity(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, IDENTITY_FILE);
}
