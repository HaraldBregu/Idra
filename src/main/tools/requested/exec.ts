import { objectSchema, stringArraySchema, type RequestedTool } from './shared';

export const execCommandTool = {
	name: 'functions.exec_command',
	description: 'Runs a shell command and returns command output or a session id for ongoing interaction.',
	schema: objectSchema({
		cmd: { type: 'string' },
		justification: { type: 'string' },
		login: { type: 'boolean' },
		max_output_tokens: { type: 'number' },
		prefix_rule: stringArraySchema,
		sandbox_permissions: { type: 'string', enum: ['use_default', 'require_escalated'] },
		shell: { type: 'string' },
		tty: { type: 'boolean' },
		workdir: { type: 'string' },
		yield_time_ms: { type: 'number' },
	}, ['cmd']),
} as const satisfies RequestedTool;
