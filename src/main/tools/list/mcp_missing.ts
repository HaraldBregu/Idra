import { textResult } from '../base/tool';

export function missing(toolName: string) {
	return textResult(`${toolName}: ConnectorsService is unavailable.`, true);
}
