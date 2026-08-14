import { BOOTSTRAP_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readBootstrap(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, BOOTSTRAP_FILE);
}
