export type McpApprovalPolicy = 'always' | 'never' | { never: { toolNames: string[] } };

export interface Mcp {
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

export abstract class McpData {
	abstract list(): Mcp[];
}
