export class McpPermissionError extends Error {
	constructor(message: string) { super(message); this.name = 'McpPermissionError'; }
}
export class McpTimeoutError extends Error {
	constructor(message: string) { super(message); this.name = 'McpTimeoutError'; }
}
export function normalizeMcpError(error: unknown, fallback = 'MCP operation failed.'): Error {
	const message = error instanceof Error ? error.message : String(error ?? fallback);
	if (/access denied|permission|unauthori[sz]ed|forbidden/i.test(message)) {
		return new McpPermissionError(message);
	}
	if (/timed?\s*out|timeout/i.test(message)) {
		return new McpTimeoutError(message);
	}
	return error instanceof Error ? error : new Error(message);
}
