export interface AgentCapability {
	id: string;
	name: string;
	kind: 'tool' | 'connector' | 'mcp';
	description?: string;
}
export interface AgentCapabilityServicePort {
	list(): AgentCapability[];
	refresh(): Promise<AgentCapability[]>;
}
