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
