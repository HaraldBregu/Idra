import { textResult } from '../../core/tool';

export function missing(toolName: string) {
	return textResult(`${toolName}: ConnectorsService is unavailable.`, true);
}
