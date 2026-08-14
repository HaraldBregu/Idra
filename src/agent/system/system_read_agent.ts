import { AGENT_FILE } from './system_types';
import { readTextFile } from './system_read_text_file';

export function readAgent(workspacePath: string): Promise<string> {
	return readTextFile(workspacePath, AGENT_FILE);
}
