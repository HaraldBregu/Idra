export type McpConnectors = {
	list(): Array<{ id: string; name: string; authKind?: string; status?: string; toolsCount?: number }>;
	reconnect(id: string): Promise<unknown>;
	refreshTools(id: string): Promise<unknown>;
	listTools(id: string, options?: unknown): Promise<unknown>;
	callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	listResources(id: unknown, options?: unknown): Promise<unknown>;
	readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown>;
	listPrompts(id: unknown, options?: unknown): Promise<unknown>;
	getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
};
