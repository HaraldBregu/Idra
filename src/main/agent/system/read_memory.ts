import { MEMORY_FILE } from './types';
import { readTextFile } from './common';

export function readMemory(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, MEMORY_FILE);
}
