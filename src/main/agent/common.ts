import {
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
} from './workspace';

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
