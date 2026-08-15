import assert from 'node:assert/strict';
import test from 'node:test';
import type { AgentSendOptions } from '../src/agent/agent';
import { createApiServer } from '../src/server/server';
import type { AgentResponseEvent } from '../src/shared/agent_types';

test('API routes work through Fastify request injection', async () => {
	const calls: Array<{ message: string; agentId: string; options: AgentSendOptions }> = [];
	const agent = {
		async send(message: string, agentId: string, options: AgentSendOptions): Promise<string> {
			calls.push({ message, agentId, options });
			if (message === 'fail') throw new Error('agent failed');

			assert.ok(options.runId);
			const events: AgentResponseEvent[] = [
				{
					type: 'run_started',
					sessionId: options.sessionId ?? 'generated-session',
					interactionMode: 'default',
					agentId,
					runId: options.runId,
				},
				{ type: 'text_delta', delta: 'Hello', agentId, runId: options.runId },
			];
			for (const event of events) options.streamEvent?.(event);
			return 'Hello';
		},
		cancel(): boolean {
			return true;
		},
	};
	const server = await createApiServer(agent, { storageApiToken: null });
	server.log.level = 'silent';

	try {
		const root = await server.inject({ method: 'GET', url: '/' });
		assert.equal(root.statusCode, 200);
		assert.match(root.headers['content-type'] ?? '', /^text\/html/);
		assert.match(root.body, /Storage test console/);
		assert.match(root.headers['content-security-policy'] ?? '', /default-src 'self'/);

		const storageTest = await server.inject({ method: 'GET', url: '/storage-test' });
		assert.equal(storageTest.statusCode, 200);
		assert.equal(storageTest.body, root.body);

		for (const asset of ['styles.css', 'api.js', 'suite.js', 'marker.js', 'app.js']) {
			const response = await server.inject({ method: 'GET', url: `/ui/${asset}` });
			assert.equal(response.statusCode, 200);
			assert.equal(response.headers['cache-control'], 'no-store');
		}

		const health = await server.inject({ method: 'GET', url: '/health' });
		assert.equal(health.statusCode, 200);
		assert.deepEqual(health.json(), { status: 'ok' });
		assert.equal((await server.inject({ method: 'GET', url: '/storage' })).statusCode, 404);

		for (const payload of [{}, { message: '' }, { message: 'hello', sessionId: '' }]) {
			const response = await server.inject({
				method: 'POST',
				url: '/agents/messages',
				payload,
			});
			assert.equal(response.statusCode, 400);
			assert.equal(response.json().code, 'FST_ERR_VALIDATION');
		}
		assert.equal(calls.length, 0);

		const streamed = await server.inject({
			method: 'POST',
			url: '/agents/messages',
			payload: { message: 'hello', sessionId: 'session-1' },
		});
		assert.equal(streamed.statusCode, 200);
		assert.equal(streamed.headers['cache-control'], 'no-cache, no-transform');
		assert.equal(streamed.headers['content-type'], 'application/x-ndjson; charset=utf-8');
		assert.equal(streamed.headers['x-accel-buffering'], 'no');
		assert.ok(streamed.body.endsWith('\n'));

		const events = streamed.body.trimEnd().split('\n').map(JSON.parse);
		assert.equal(events.length, 2);
		assert.equal(events[0].type, 'run_started');
		assert.equal(events[0].sessionId, 'session-1');
		assert.deepEqual(events[1], {
			type: 'text_delta',
			delta: 'Hello',
			agentId: 'main',
			runId: events[0].runId,
		});

		const call = calls[0];
		assert.ok(call);
		assert.equal(call.message, 'hello');
		assert.equal(call.agentId, 'main');
		assert.equal(call.options.sessionId, 'session-1');
		assert.equal(call.options.type, 'default');
		assert.equal(call.options.streaming, true);
		assert.equal(call.options.contextMode, 'workspace');
		assert.equal(call.options.interactionMode, 'default');
		assert.match(
			call.options.runId ?? '',
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
		assert.equal(events[0].runId, call.options.runId);

		await server.inject({
			method: 'POST',
			url: '/agents/messages',
			payload: { message: 'without session' },
		});
		assert.equal(Object.hasOwn(calls[1]?.options ?? {}, 'sessionId'), false);

		const failed = await server.inject({
			method: 'POST',
			url: '/agents/messages',
			payload: { message: 'fail' },
		});
		assert.equal(failed.statusCode, 200);
		assert.deepEqual(failed.body.trimEnd().split('\n').map(JSON.parse), [
			{ type: 'error', message: 'agent failed' },
		]);
	} finally {
		await server.close();
	}
});
