export interface McpStdioServer {
	id: string;
	transport: 'stdio';
	command: string;
	args: string[];
	enabled: boolean;
}

export interface McpHttpServer {
	id: string;
	transport: 'http';
	url: string;
	headers?: Record<string, string>;
	enabled: boolean;
}

export type McpServer = McpStdioServer | McpHttpServer;

export interface McpDocument {
	servers: McpServer[];
}
