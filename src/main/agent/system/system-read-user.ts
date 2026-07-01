import { USER_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readUser(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, USER_FILE);
}
