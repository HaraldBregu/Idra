export class StorageApi {
	#token = '';
	#onResult;

	constructor(onResult) {
		this.#onResult = onResult;
	}

	setToken(token) {
		this.#token = token;
	}

	async request(endpoint, options = {}) {
		const method = options.method ?? 'GET';
		const startedAt = performance.now();
		let recorded = false;
		try {
			const headers = { authorization: `Bearer ${this.#token}` };
			if (options.body !== undefined) headers['content-type'] = 'application/json';
			const response = await fetch(endpoint, {
				method,
				headers,
				body: options.body === undefined ? undefined : JSON.stringify(options.body),
			});
			const responseText = await response.text();
			let data = responseText;
			if (responseText) {
				try {
					data = JSON.parse(responseText);
				} catch {
					data = responseText;
				}
			}
			const result = {
				method,
				endpoint,
				status: response.status,
				duration: Math.round(performance.now() - startedAt),
				data,
			};
			recorded = true;
			this.#onResult(result);
			if (!response.ok) {
				const message =
					typeof data === 'object' && data !== null
						? (data.message ?? data.error ?? `Request failed with status ${response.status}`)
						: String(data || `Request failed with status ${response.status}`);
				const error = new Error(message);
				error.status = response.status;
				throw error;
			}
			return data;
		} catch (error) {
			if (!recorded) {
				this.#onResult({
					method,
					endpoint,
					status: 0,
					duration: Math.round(performance.now() - startedAt),
					data: { error: error instanceof Error ? error.message : String(error) },
				});
			}
			throw error;
		}
	}
}
