import { MEMORY_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readMemory(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, MEMORY_FILE);
}
