import { SOUL_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readSoul(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, SOUL_FILE);
}
