import { BOOTSTRAP_FILE } from './types';
import { readTextFile } from './common';

export function readBootstrap(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, BOOTSTRAP_FILE);
}
