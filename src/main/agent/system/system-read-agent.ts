import { AGENT_FILE } from './system-types';
import { readTextFile } from './system-read-text-file';

export function readAgent(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, AGENT_FILE);
}
