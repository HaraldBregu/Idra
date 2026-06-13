export type AgentMcpApprovalPolicy = 'always' | 'never' | { never: { toolNames: string[] } };

export interface AgentMcpTool {
	serverLabel: string;
	connectorId?: string;
	authorization?: string;
	headers?: Record<string, string>;
	requireApproval?: AgentMcpApprovalPolicy;
	allowedTools?: string[];
	deferLoading?: boolean;
	serverDescription?: string;
	enabled?: boolean;
}

export interface AgentMcpServer {
	name: string;
	url: string;
	authorizationToken?: string;
	allowedTools?: string[];
	enabled?: boolean;
}

export interface AgentMcpConfig {
	tools: AgentMcpTool[];
	servers: AgentMcpServer[];
}

export abstract class AgentMcp {
	abstract list(): AgentMcpConfig;
}
