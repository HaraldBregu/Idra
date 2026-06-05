import { parseOutput } from '../parser';
import type { RuntimeModelResponse, RuntimeOutput } from '../types';

export function observe(response: RuntimeModelResponse): RuntimeOutput {
	const output = parseOutput(response.text);

	return {
		text: output.text,
		toolCalls: output.toolCalls,
		model: response.model,
		stopReason: response.stopReason,
	};
}
