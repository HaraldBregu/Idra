export type AgentHarnessHookContext = {
	runId: string;
	agentId?: string;
	sessionKey?: string;
	sessionId?: string;
	provider?: string;
	modelId?: string;
	channelId?: string;
};

export function buildAgentHookContext(params: AgentHarnessHookContext): AgentHarnessHookContext {
	return { ...params };
}
