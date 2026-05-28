import { McpTimeoutError } from './errors';

export async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label = 'MCP operation'): Promise<T> {
	let timeout: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			work,
			new Promise<T>((_, reject) => {
				timeout = setTimeout(() => reject(new McpTimeoutError(`${label} timed out.`)), timeoutMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

export async function withRetry<T>(work: () => Promise<T>, attempts = 2): Promise<T> {
	let last: unknown;
	for (let i = 0; i < attempts; i++) {
		try { return await work(); } catch (error) { last = error; }
	}
	throw last;
}
