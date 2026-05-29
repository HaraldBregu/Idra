export const AGENT_CAPABILITY_SERVICE_KINDS = ['tool', 'connector', 'mcp'] as const;
export type AgentCapabilityServiceKind = (typeof AGENT_CAPABILITY_SERVICE_KINDS)[number];

export const AGENT_TOOL_RESULT_STATUSES = ['ok', 'error', 'blocked', 'rejected'] as const;
export type AgentToolResultStatus = (typeof AGENT_TOOL_RESULT_STATUSES)[number];

export const AGENT_RUN_STOP_REASONS = [
	'end_turn',
	'max_tokens',
	'max_iterations',
	'error',
	'cancelled',
] as const;
export type AgentRunStopReason = (typeof AGENT_RUN_STOP_REASONS)[number];

export function isAgentCapabilityServiceKind(value: unknown): value is AgentCapabilityServiceKind {
	return AGENT_CAPABILITY_SERVICE_KINDS.includes(value as AgentCapabilityServiceKind);
}

export function isAgentToolResultStatus(value: unknown): value is AgentToolResultStatus {
	return AGENT_TOOL_RESULT_STATUSES.includes(value as AgentToolResultStatus);
}

export function isAgentRunStopReason(value: unknown): value is AgentRunStopReason {
	return AGENT_RUN_STOP_REASONS.includes(value as AgentRunStopReason);
}
