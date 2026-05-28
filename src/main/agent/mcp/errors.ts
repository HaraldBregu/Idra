export class McpPermissionError extends Error {
	constructor(message: string) { super(message); this.name = 'McpPermissionError'; }
}
export class McpTimeoutError extends Error {
	constructor(message: string) { super(message); this.name = 'McpTimeoutError'; }
}
export function normalizeMcpError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}
