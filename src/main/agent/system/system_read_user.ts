import { USER_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readUser(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, USER_FILE);
}
