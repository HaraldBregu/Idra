export const MCP_PACKAGES = [
	'@modelcontextprotocol/server-memory',
	'@modelcontextprotocol/server-filesystem',
	'@modelcontextprotocol/server-everything',
] as const;

export type McpPackage = (typeof MCP_PACKAGES)[number];

export interface McpServer {
	id: string;
	package: McpPackage;
	args: string[];
	enabled: boolean;
}

export interface McpDocument {
	servers: McpServer[];
}
