export async function runBrowserPageOperation<T>(
	page: { close(): Promise<void> },
	signal: AbortSignal | undefined,
	operation: () => Promise<T>
): Promise<T> {
	signal?.throwIfAborted();
	if (!signal) return operation();
	const abort = (): void => {
		void page.close().catch(() => undefined);
	};
	signal.addEventListener('abort', abort, { once: true });
	try {
		const result = await operation();
		signal.throwIfAborted();
		return result;
	} finally {
		signal.removeEventListener('abort', abort);
	}
}
