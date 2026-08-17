export const MCP_PACKAGES = [
	'@modelcontextprotocol/server-memory',
	'@modelcontextprotocol/server-filesystem',
	'@modelcontextprotocol/server-everything',
] as const;

export type McpPackage = (typeof MCP_PACKAGES)[number];

export const MCP_EXECUTABLES: Record<McpPackage, string> = {
	'@modelcontextprotocol/server-memory': 'node_modules/@modelcontextprotocol/server-memory/dist/index.js',
	'@modelcontextprotocol/server-filesystem': 'node_modules/@modelcontextprotocol/server-filesystem/dist/index.js',
	'@modelcontextprotocol/server-everything': 'node_modules/@modelcontextprotocol/server-everything/dist/index.js',
};

export interface McpServer {
	id: string;
	package: McpPackage;
	args: string[];
	enabled: boolean;
}

export interface McpDocument {
	servers: McpServer[];
}
