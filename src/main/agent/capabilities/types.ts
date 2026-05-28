export interface AgentCapability {
	id: string;
	name: string;
	kind: 'tool' | 'connector' | 'mcp';
	description?: string;
}
export interface AgentCapabilityServicePort {
	list(): AgentCapability[];
	refresh(): Promise<AgentCapability[]>;
	resolveForPrompt(input: AgentCapabilityResolveInput): Promise<import('./resolve').ResolvedAgentCapabilities>;
}

export interface AgentCapabilityResolveInput {
	message: string;
	localTools: import('./local').AgentTool[];
	configuredSkillNames?: readonly string[];
	toolsAllow?: readonly string[];
	toolsDeny?: readonly string[];
}
