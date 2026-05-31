export type AgentToolApprovalPolicy =
	| { mode: 'none' }
	| { mode: 'action'; actions: readonly string[] }
	| { mode: 'always' };

export const AGENT_TOOL_APPROVAL_NONE = { mode: 'none' } as const;
export const AGENT_TOOL_APPROVAL_ALWAYS = { mode: 'always' } as const;
