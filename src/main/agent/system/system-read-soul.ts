import { SOUL_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readSoul(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, SOUL_FILE);
}
