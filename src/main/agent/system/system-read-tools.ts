import { TOOLS_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readTools(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, TOOLS_FILE);
}
