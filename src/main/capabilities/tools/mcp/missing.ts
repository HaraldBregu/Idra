import { textResult } from '../core/types';

export function missing(toolName: string) {
	return textResult(`${toolName}: ConnectorsService is unavailable.`, true);
}
