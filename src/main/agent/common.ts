import {
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
} from './workspace';
import type { Level } from './types';

export const AGENT_APP_DATA_DIRECTORY_NAME = 'friday';
export const AGENT_DATA_DIRECTORY_NAME = 'agent';

export const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export const MIN_RANK =
	RANK[(process.env['LOG_LEVEL']?.toLowerCase() as Level | undefined) ?? 'info'] ?? 1;

export const AGENT_TOOL_LIMITS = {
	maxTokens: 4096,
	maxIterations: 25,
	defaultMaxPromptTools: 9,
} as const;

export const SECONDARY_SESSION_CONTEXT_ALLOWLIST = new Set([
	'AGENTS.md',
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
]);

function emit(level: Level, ctx: string, msg: string, data?: Record<string, unknown>): void {
	if (RANK[level] < MIN_RANK) return;
	process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), level, ctx, msg, ...data }) + '\n');
}

export const agentLogger = {
	debug: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('debug', ctx, msg, data),
	info: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('info', ctx, msg, data),
	warn: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('warn', ctx, msg, data),
	error: (ctx: string, msg: string, data?: Record<string, unknown>) => emit('error', ctx, msg, data),
};
