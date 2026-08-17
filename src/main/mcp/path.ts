import path from 'node:path';

export function mcpPath(dataDirectory: string): string {
	return path.join(path.resolve(dataDirectory), 'mcp.json');
}
