import type { AgentRuntimeErrorShape } from './types';

export type AgentRuntimeErrorCode = 'config_invalid' | 'permission_denied' | 'provider_failed' | 'tool_failed' | 'cancelled';

export class AgentRuntimeError extends Error {
	readonly code?: AgentRuntimeErrorCode;
	readonly recoverable: boolean;
	readonly details?: unknown;
	constructor(input: { code?: AgentRuntimeErrorCode; message: string; recoverable?: boolean; details?: unknown; cause?: unknown }) {
		super(input.message, { cause: input.cause });
		this.name = 'AgentRuntimeError';
		this.code = input.code;
		this.recoverable = input.recoverable ?? false;
		this.details = input.details;
	}
}

export function toRuntimeErrorShape(error: unknown): AgentRuntimeErrorShape {
	return {
		name: error instanceof Error ? error.name : 'Error',
		message: error instanceof Error ? error.message : String(error),
		code: error instanceof AgentRuntimeError ? error.code : undefined,
		recoverable: error instanceof AgentRuntimeError ? error.recoverable : false,
		details: error instanceof AgentRuntimeError ? error.details : undefined,
	};
}
