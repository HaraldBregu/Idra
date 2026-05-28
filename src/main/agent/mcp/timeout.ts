import { McpTimeoutError } from './errors';

export async function withTimeout<T>(
	label: string,
	timeoutMs: number,
	work: (signal: AbortSignal) => Promise<T>
): Promise<T>;
export async function withTimeout<T>(
	work: Promise<T>,
	timeoutMs: number,
	label?: string
): Promise<T>;
export async function withTimeout<T>(
	first: string | Promise<T>,
	timeoutMs: number,
	third: string | ((signal: AbortSignal) => Promise<T>) = 'MCP operation'
): Promise<T> {
	const controller = new AbortController();
	const label = typeof first === 'string' ? first : typeof third === 'string' ? third : 'MCP operation';
	const work = typeof first === 'string' ? third as (signal: AbortSignal) => Promise<T> : () => first;
	let timeout: NodeJS.Timeout | undefined;
	try {
		return await Promise.race([
			work(controller.signal),
			new Promise<T>((_, reject) => {
				timeout = setTimeout(() => {
					reject(new McpTimeoutError(`${label} timed out.`));
					controller.abort();
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

export async function withRetry<T>(retries: number, work: () => Promise<T>): Promise<T>;
export async function withRetry<T>(work: () => Promise<T>, attempts?: number): Promise<T>;
export async function withRetry<T>(
	first: number | (() => Promise<T>),
	second: (() => Promise<T>) | number = 2
): Promise<T> {
	const retries = typeof first === 'number' ? first : Number(second) - 1;
	const work = typeof first === 'number' ? second as () => Promise<T> : first;
	let last: unknown;
	for (let i = 0; i <= retries; i++) {
		try { return await work(); } catch (error) { last = error; }
	}
	throw last;
}
