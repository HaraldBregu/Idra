import { parseOutput } from '../parser';
import type { RuntimeModelResponse, RuntimeOutput } from '../types';

export function observe(response: RuntimeModelResponse): RuntimeOutput {
	const output = parseOutput(response.content);

	return {
		text: output.text,
		toolCalls: output.toolCalls,
		model: response.model ?? 'default',
		stopReason: response.stopReason,
	};
}
