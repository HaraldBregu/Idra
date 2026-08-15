import { AGENT_FILE } from './types';
import { readTextFile } from './common';

export function readAgent(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, AGENT_FILE);
}
