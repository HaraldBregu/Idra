import { USER_FILE } from './types';
import { readTextFile } from './common';

export function readUser(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, USER_FILE);
}
