export class McpConnectionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'McpConnectionError';
	}
}

export class McpToolExecutionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'McpToolExecutionError';
	}
}

export class McpTimeoutError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'McpTimeoutError';
	}
}

export class McpPermissionError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'McpPermissionError';
	}
}

export function normalizeMcpError(error: unknown, fallback: string): Error {
	if (error instanceof Error) {
		if (error.name === 'AbortError' || /timeout|timed out/i.test(error.message)) {
			return new McpTimeoutError(error.message || fallback, { cause: error });
		}
		if (/unauthorized|forbidden|permission|access denied/i.test(error.message)) {
			return new McpPermissionError(error.message, { cause: error });
		}
		return error;
	}
	return new Error(String(error || fallback));
}
