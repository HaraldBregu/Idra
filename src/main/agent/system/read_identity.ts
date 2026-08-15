import { IDENTITY_FILE } from './types';
import { readTextFile } from './common';

export function readIdentity(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, IDENTITY_FILE);
}
