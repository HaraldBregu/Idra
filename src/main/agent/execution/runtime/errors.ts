import type { AgentHarnessErrorShape } from './types';

export type AgentHarnessErrorCode = 'config_invalid' | 'permission_denied' | 'provider_failed' | 'tool_failed' | 'cancelled';

export class AgentHarnessError extends Error {
	readonly code?: AgentHarnessErrorCode;
	readonly recoverable: boolean;
	readonly details?: unknown;
	constructor(input: { code?: AgentHarnessErrorCode; message: string; recoverable?: boolean; details?: unknown; cause?: unknown }) {
		super(input.message, { cause: input.cause });
		this.name = 'AgentHarnessError';
		this.code = input.code;
		this.recoverable = input.recoverable ?? false;
		this.details = input.details;
	}
}

export function toHarnessErrorShape(error: unknown): AgentHarnessErrorShape {
	return {
		name: error instanceof Error ? error.name : 'Error',
		message: error instanceof Error ? error.message : String(error),
		code: error instanceof AgentHarnessError ? error.code : undefined,
		recoverable: error instanceof AgentHarnessError ? error.recoverable : false,
		details: error instanceof AgentHarnessError ? error.details : undefined,
	};
}
