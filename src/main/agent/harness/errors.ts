import type { AgentHarnessErrorShape } from './types';

export type AgentHarnessErrorCode =
	| 'config_invalid'
	| 'budget_exhausted'
	| 'cancelled'
	| 'provider_failed'
	| 'tool_failed'
	| 'tool_validation_failed'
	| 'permission_denied'
	| 'mcp_failed'
	| 'connector_failed'
	| 'storage_failed'
	| 'unknown';

export class AgentHarnessError extends Error {
	readonly code: AgentHarnessErrorCode;
	readonly recoverable: boolean;
	readonly details?: unknown;

	constructor(input: {
		message: string;
		code?: AgentHarnessErrorCode;
		recoverable?: boolean;
		details?: unknown;
		cause?: unknown;
	}) {
		super(input.message, { cause: input.cause });
		this.name = 'AgentHarnessError';
		this.code = input.code ?? 'unknown';
		this.recoverable = input.recoverable ?? false;
		this.details = input.details;
	}
}

export function toHarnessErrorShape(error: unknown): AgentHarnessErrorShape {
	if (error instanceof AgentHarnessError) {
		return {
			name: error.name,
			message: error.message,
			code: error.code,
			recoverable: error.recoverable,
			details: error.details,
		};
	}
	if (error instanceof Error) {
		return {
			name: error.name || 'Error',
			message: error.message,
			recoverable: isRecoverableError(error),
		};
	}
	return {
		name: 'Error',
		message: String(error),
		recoverable: false,
	};
}

export function isRecoverableError(error: unknown): boolean {
	if (error instanceof AgentHarnessError) return error.recoverable;
	const message = error instanceof Error ? error.message : String(error);
	return /timeout|temporar|rate.?limit|429|503|502|500|network|econnreset|etimedout/i.test(message);
}
