import { BOOTSTRAP_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readBootstrap(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, BOOTSTRAP_FILE);
}
