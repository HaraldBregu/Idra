import { SOUL_FILE } from './types';
import { readTextFile } from './common';

export function readSoul(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, SOUL_FILE);
}
