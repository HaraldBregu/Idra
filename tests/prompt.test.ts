import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentApi } from '../src/ui/agent.js';

test('agent UI client authenticates, reuses sessions, and parses chunked NDJSON', async () => {
	const originalFetch = globalThis.fetch;
	const requests: Array<{ authorization: string | null; body: unknown }> = [];
	globalThis.fetch = async (_input, init) => {
		const headers = new Headers(init?.headers);
		requests.push({
			authorization: headers.get('authorization'),
			body: JSON.parse(String(init?.body)),
		});
		const encoder = new TextEncoder();
		return new Response(
			new ReadableStream({
				start(controller) {
					controller.enqueue(
						encoder.encode('{"type":"run_started","sessionId":"session-1"}\n{"type":"text_')
					);
					controller.enqueue(encoder.encode('delta","delta":"Hello"}\n{"type":"run_finished"}'));
					controller.close();
				},
			}),
			{ status: 200, headers: { 'content-type': 'application/x-ndjson' } }
		);
	};

	try {
		const api = new AgentApi();
		const events: Array<Record<string, unknown>> = [];
		await api.prompt('Hello', 'session-existing', (event) => events.push(event));

		assert.deepEqual(requests, [
			{
				authorization: null,
				body: { message: 'Hello', sessionId: 'session-existing' },
			},
		]);
		assert.deepEqual(events, [
			{ type: 'run_started', sessionId: 'session-1' },
			{ type: 'text_delta', delta: 'Hello' },
			{ type: 'run_finished' },
		]);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('agent UI client surfaces HTTP and streamed agent errors', async () => {
	const originalFetch = globalThis.fetch;
	try {
		globalThis.fetch = async () =>
			new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' },
			});
		await assert.rejects(
			new AgentApi().prompt('Hello', '', () => {}),
			/Unauthorized/
		);

		globalThis.fetch = async () =>
			new Response('{"type":"error","message":"provider failed"}\n', { status: 200 });
		await assert.rejects(
			new AgentApi().prompt('Hello', '', () => {}),
			/provider failed/
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
