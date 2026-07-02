import { TOOLS_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readTools(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, TOOLS_FILE);
}
