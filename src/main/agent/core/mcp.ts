export type McpApprovalPolicy = 'always' | 'never' | { never: { toolNames: string[] } };

export interface Mcp {
	serverLabel: string;
	serverUrl?: string;
	connectorId?: string;
	authorization?: string;
	requireApproval?: McpApprovalPolicy;
	allowedTools?: string[];
	deferLoading?: boolean;
	serverDescription?: string;
	enabled?: boolean;
}

export abstract class McpData {
	abstract mcp(): Mcp[];
	refresh?(): Promise<void>;
}
