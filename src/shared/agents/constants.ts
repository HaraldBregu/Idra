export const AGENT_CAPABILITY_SERVICE_KINDS = ['tool', 'connector', 'mcp'] as const;
export type AgentCapabilityServiceKind = (typeof AGENT_CAPABILITY_SERVICE_KINDS)[number];

export const AGENT_TOOL_RESULT_STATUSES = ['ok', 'error', 'blocked'] as const;
export type AgentToolResultStatus = (typeof AGENT_TOOL_RESULT_STATUSES)[number];

export const AGENT_RUN_STOP_REASONS = [
	'end_turn',
	'max_tokens',
	'max_iterations',
	'error',
	'cancelled',
] as const;
export type AgentRunStopReason = (typeof AGENT_RUN_STOP_REASONS)[number];
