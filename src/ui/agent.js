export class AgentApi {
	#token = '';

	setToken(token) {
		this.#token = token;
	}

	async prompt(message, sessionId, onEvent) {
		const response = await fetch('/agents/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(this.#token ? { authorization: `Bearer ${this.#token}` } : {}),
			},
			body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
		});
		if (!response.ok) {
			const text = await response.text();
			let message = text || `Request failed with status ${response.status}`;
			try {
				const data = JSON.parse(text);
				message = data.message ?? data.error ?? message;
			} catch {}
			throw Object.assign(new Error(message), { status: response.status });
		}
		if (!response.body) throw new Error('The agent response did not include a stream.');

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		while (true) {
			const { value, done } = await reader.read();
			buffer += decoder.decode(value, { stream: !done });
			const lines = buffer.split('\n');
			buffer = done ? '' : (lines.pop() ?? '');
			for (const line of lines) {
				if (!line.trim()) continue;
				const event = JSON.parse(line);
				onEvent(event);
				if (event.type === 'error' || event.type === 'run_error') {
					throw new Error(event.message ?? 'The agent run failed.');
				}
			}
			if (done) break;
		}
	}
}
