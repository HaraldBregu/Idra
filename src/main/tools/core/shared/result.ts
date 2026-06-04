import type { AgentToolResult } from '../common';

export function blockedToolResult(input: {
	reason: string;
	deniedReason?: string;
}): AgentToolResult<{ status: 'blocked'; reason: string; deniedReason?: string }> {
	return {
		content: [{ type: 'text', text: input.reason }],
		details: {
			status: 'blocked',
			reason: input.reason,
			deniedReason: input.deniedReason,
		},
	};
}

export function errorToolResult(input: {
	toolName: string;
	error: unknown;
}): AgentToolResult<{ status: 'error'; toolName: string; message: string; name?: string }> {
	const error = input.error instanceof Error ? input.error : new Error(String(input.error));
	return {
		content: [{ type: 'text', text: `tool ${input.toolName} failed: ${error.message}` }],
		details: {
			status: 'error',
			toolName: input.toolName,
			message: error.message,
			name: error.name,
		},
	};
}
