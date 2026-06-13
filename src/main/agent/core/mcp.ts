export type McpApprovalPolicy = 'always' | 'never' | { never: { toolNames: string[] } };

export interface McpTool {
	serverLabel: string;
	connectorId?: string;
	authorization?: string;
	headers?: Record<string, string>;
	requireApproval?: McpApprovalPolicy;
	allowedTools?: string[];
	deferLoading?: boolean;
	serverDescription?: string;
	enabled?: boolean;
}

export interface McpServer {
	name: string;
	url: string;
	authorizationToken?: string;
	allowedTools?: string[];
	enabled?: boolean;
}

export interface McpConfig {
	tools: McpTool[];
	servers: McpServer[];
}

export abstract class Mcp {
	abstract list(): McpConfig;
}
