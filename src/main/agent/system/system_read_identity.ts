import { IDENTITY_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readIdentity(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, IDENTITY_FILE);
}
