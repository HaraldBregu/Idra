import { objectSchema, type RequestedTool } from './shared';

export const writeStdinTool = {
	name: 'functions.write_stdin',
	description: 'Writes text to a running exec_command session and returns recent output.',
	schema: objectSchema({
		session_id: { type: 'number' },
		chars: { type: 'string' },
		max_output_tokens: { type: 'number' },
		yield_time_ms: { type: 'number' },
	}, ['session_id']),
} as const satisfies RequestedTool;
