import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Role, TaskState, type SendMessageRequest, type StreamResponse } from '@a2a-js/sdk';
import { ClientFactory, RestTransportFactory } from '@a2a-js/sdk/client';
import { createA2aServer } from '../src/main/a2a/server';
import type { AgentSendOptions } from '../src/main/agent/agent';

test('the official A2A REST client discovers Idra and streams continuous contexts', async (context) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'idra-a2a-client-'));
	const token = 'official-client-test-token-32-bytes-long';
	const requests: Array<{ message: string; options: AgentSendOptions }> = [];
	const agent = {
		async send(message: string, agentId: string, options: AgentSendOptions): Promise<string> {
			requests.push({ message, options });
			const runId = options.runId ?? 'missing-run';
			options.streamEvent?.({ type: 'text_delta', delta: `${message}:`, agentId, runId });
			options.streamEvent?.({ type: 'text_delta', delta: 'done', agentId, runId });
			options.streamEvent?.({
				type: 'run_finished',
				stopReason: 'end_turn',
				outputChars: message.length + 5,
				agentId,
				runId,
			});
			return `${message}:done`;
		},
		cancel(): boolean {
			return true;
		},
	};

	let port: number;
	try {
		port = await new Promise<number>((resolve, reject) => {
			const probe = net.createServer();
			probe.once('error', reject);
			probe.listen({ host: '127.0.0.1', port: 0 }, () => {
				const address = probe.address();
				assert.ok(address && typeof address === 'object');
				probe.close((error) => (error ? reject(error) : resolve(address.port)));
			});
		});
	} catch (error) {
		fs.rmSync(directory, { recursive: true, force: true });
		if ((error as NodeJS.ErrnoException).code === 'EPERM') {
			context.skip('The execution sandbox does not allow local listening sockets.');
			return;
		}
		throw error;
	}

	const baseUrl = `http://127.0.0.1:${port}`;
	const server = await createA2aServer(agent, {
		agentToken: token,
		dataDirectory: directory,
		publicUrl: baseUrl,
	});
	server.log.level = 'silent';

	try {
		try {
			await server.listen({ host: '127.0.0.1', port });
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'EPERM') {
				context.skip('The execution sandbox does not allow local listening sockets.');
				return;
			}
			throw error;
		}

		const cardResponse = await fetch(`${baseUrl}/.well-known/agent-card.json`);
		assert.equal(cardResponse.status, 200);
		const card = (await cardResponse.json()) as Record<string, any>;
		assert.equal(card.supportedInterfaces[0].url, `${baseUrl}/a2a`);
		assert.equal(card.supportedInterfaces[0].protocolBinding, 'HTTP+JSON');
		assert.equal(card.supportedInterfaces[0].protocolVersion, '1.0');
		assert.equal(card.securitySchemes.bearerAuth.httpAuthSecurityScheme.scheme, 'Bearer');

		const client = await new ClientFactory({
			transports: [new RestTransportFactory()],
		}).createFromUrl(baseUrl);
		const requestOptions = {
			serviceParameters: { Authorization: `Bearer ${token}` },
		};
		const firstRequest: SendMessageRequest = {
			tenant: '',
			message: {
				messageId: randomUUID(),
				contextId: '',
				taskId: '',
				role: Role.ROLE_USER,
				parts: [
					{
						content: { $case: 'text', value: 'first' },
						mediaType: 'text/plain',
						filename: '',
						metadata: {},
					},
				],
				metadata: {},
				extensions: [],
				referenceTaskIds: [],
			},
			configuration: undefined,
			metadata: {},
		};
		const firstEvents: StreamResponse[] = [];
		for await (const event of client.sendMessageStream(firstRequest, requestOptions)) {
			firstEvents.push(event);
		}

		assert.deepEqual(
			firstEvents.map((event) => event.payload?.$case),
			['task', 'statusUpdate', 'artifactUpdate', 'artifactUpdate', 'statusUpdate']
		);
		assert.equal(firstEvents[0].payload?.$case, 'task');
		if (firstEvents[0].payload?.$case !== 'task') assert.fail('Expected the initial task event.');
		const firstTask = firstEvents[0].payload.value;
		assert.equal(firstTask.status?.state, TaskState.TASK_STATE_SUBMITTED);
		assert.equal(firstEvents.at(-1)?.payload?.$case, 'statusUpdate');
		if (firstEvents.at(-1)?.payload?.$case !== 'statusUpdate') {
			assert.fail('Expected a terminal status update.');
		}
		assert.equal(firstEvents.at(-1)?.payload.value.status?.state, TaskState.TASK_STATE_COMPLETED);
		assert.equal(
			firstEvents
				.filter((event) => event.payload?.$case === 'artifactUpdate')
				.flatMap((event) =>
					event.payload?.$case === 'artifactUpdate'
						? (event.payload.value.artifact?.parts ?? []).map((part) =>
								part.content?.$case === 'text' ? part.content.value : ''
							)
						: []
				)
				.join(''),
			'first:done'
		);

		const secondRequest: SendMessageRequest = {
			...firstRequest,
			message: {
				...firstRequest.message!,
				messageId: randomUUID(),
				contextId: firstTask.contextId,
				parts: [
					{
						content: { $case: 'text', value: 'second' },
						mediaType: 'text/plain',
						filename: '',
						metadata: {},
					},
				],
			},
		};
		const secondEvents: StreamResponse[] = [];
		for await (const event of client.sendMessageStream(secondRequest, requestOptions)) {
			secondEvents.push(event);
		}
		assert.equal(secondEvents[0].payload?.$case, 'task');
		if (secondEvents[0].payload?.$case !== 'task') assert.fail('Expected the follow-up task.');
		assert.equal(secondEvents[0].payload.value.contextId, firstTask.contextId);
		assert.notEqual(secondEvents[0].payload.value.id, firstTask.id);
		assert.deepEqual(
			requests.map((request) => ({
				message: request.message,
				runId: request.options.runId,
				sessionId: request.options.sessionId,
			})),
			[
				{ message: 'first', runId: firstTask.id, sessionId: firstTask.contextId },
				{
					message: 'second',
					runId: secondEvents[0].payload.value.id,
					sessionId: firstTask.contextId,
				},
			]
		);
	} finally {
		await server.close();
		fs.rmSync(directory, { recursive: true, force: true });
	}
});
