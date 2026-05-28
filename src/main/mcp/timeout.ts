import { McpTimeoutError } from './errors';

export interface McpCallOptions {
	timeoutMs?: number;
	retries?: number;
	signal?: AbortSignal;
}

export const DEFAULT_MCP_CONNECT_TIMEOUT_MS = 10_000;
export const DEFAULT_MCP_TOOL_TIMEOUT_MS = 30_000;

export async function withTimeout<T>(
	label: string,
	timeoutMs: number,
	run: (signal: AbortSignal) => Promise<T>,
	parentSignal?: AbortSignal
): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = (): void => controller.abort();

	parentSignal?.addEventListener('abort', onAbort, { once: true });
	try {
		if (parentSignal?.aborted) controller.abort();
		return await run(controller.signal);
	} catch (error) {
		if (controller.signal.aborted) {
			throw new McpTimeoutError(`${label} timed out after ${timeoutMs}ms.`, { cause: error });
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		parentSignal?.removeEventListener('abort', onAbort);
	}
}

export async function withRetry<T>(retries: number, run: () => Promise<T>): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			return await run();
		} catch (error) {
			lastError = error;
			if (attempt === retries) break;
		}
	}
	throw lastError;
}
