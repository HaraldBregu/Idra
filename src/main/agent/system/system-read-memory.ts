import { MEMORY_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readMemory(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, MEMORY_FILE);
}
