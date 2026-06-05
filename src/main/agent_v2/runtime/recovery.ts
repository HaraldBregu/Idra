export async function retry<T>(maxRetries: number, work: () => Promise<T>): Promise<T> {
	let attempt = 0;
	let lastError: unknown;

	while (attempt <= maxRetries) {
		try {
			return await work();
		} catch (error) {
			lastError = error;
			attempt += 1;
		}
	}

	throw lastError;
}
