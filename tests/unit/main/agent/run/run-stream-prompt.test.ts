import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const successfulTurn = async function* () {
	yield* [];
	return { content: 'done', model: 'test-model', toolCalls: [] };
};
const runModelTurnMock = jest.fn(successfulTurn);
const appendRunMock = jest.fn();

jest.mock('../../../../../src/main/settings_store', () => ({
	getModelId: jest.fn(() => 'test-model'),
	getResolvedProvider: jest.fn(() => ({ id: 'test-provider', apiKey: 'key' })),
}));

jest.mock('../../../../../src/main/agent/run/run_model_turn', () => ({
	runModelTurn: (...args: unknown[]) => runModelTurnMock(...args),
}));

jest.mock('../../../../../src/main/agent/session/session_append_run', () => ({
	appendRun: (...args: unknown[]) => appendRunMock(...args),
}));

jest.mock('../../../../../src/main/agent/skills', () => ({
	listSkills: jest.fn(() => []),
}));

import { stream } from '../../../../../src/main/agent/run/run_stream';
import { createSessionState } from '../../../../../src/main/agent/session';
import type { Message } from '../../../../../src/main/agent/types';

describe('run stream system prompt', () => {
	beforeEach(() => {
		runModelTurnMock.mockReset().mockImplementation(successfulTurn);
		appendRunMock.mockReset();
	});

	it('sends workspace files as user context instead of system instructions', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-run-prompt-'));
		try {
			await fs.writeFile(path.join(root, 'USER.md'), '- **Name:** Alice');
			await fs.writeFile(path.join(root, 'MEMORY.md'), '- Private preference');
			const session = createSessionState();
			session.id = 'session';
			session.messages = [{ role: 'user', content: 'Current request' }];

			for await (const event of stream(
				{ location: root },
				session,
				{
					runId: 'run',
					task: 'chat',
					message: 'Current request',
					model: 'test-model',
					origin: 'main',
					contextMode: 'workspace',
				},
				new AbortController().signal,
				{ tools: [] }
			))
				void event;

			const systemPrompt = runModelTurnMock.mock.calls[0][3] as string;
			const messages = runModelTurnMock.mock.calls[0][4] as Message[];
			expect(systemPrompt).not.toContain('Alice');
			expect(systemPrompt).not.toContain('Private preference');
			expect(messages[0]).toMatchObject({
				role: 'user',
				content: expect.stringContaining('- **Name:** Alice'),
			});
			expect(messages[0].content).toEqual(expect.stringContaining('- Private preference'));
			expect(messages[1]).toEqual({ role: 'user', content: 'Current request' });
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('emits exactly one terminal event when cancelled', async () => {
		const session = createSessionState();
		session.id = 'session';
		const controller = new AbortController();
		controller.abort(new Error('cancelled'));
		const events = [];

		for await (const event of stream(
			{ location: '/workspace' },
			session,
			{
				runId: 'run',
				task: 'chat',
				message: 'request',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			controller.signal,
			{ tools: [] }
		)) events.push(event);

		expect(events.filter((event) => event.type === 'run_finished')).toHaveLength(1);
		expect(events.at(-1)).toMatchObject({
			type: 'run_finished',
			result: { stopReason: 'cancelled' },
		});
	});

	it('emits exactly one terminal event before propagating a model failure', async () => {
		runModelTurnMock.mockImplementationOnce(async function* () {
			throw new Error('provider failed');
		});
		const session = createSessionState();
		session.id = 'session';
		const events = [];

		await expect(async () => {
			for await (const event of stream(
				{ location: '/workspace' },
				session,
				{
					runId: 'run',
					task: 'chat',
					message: 'request',
					model: 'test-model',
					origin: 'main',
					contextMode: 'minimal',
				},
				new AbortController().signal,
				{ tools: [] }
			)) events.push(event);
		}).rejects.toThrow('provider failed');

		expect(events.filter((event) => event.type === 'run_finished')).toHaveLength(1);
		expect(events.at(-1)).toMatchObject({
			type: 'run_finished',
			result: { stopReason: 'error' },
		});
	});

	it('emits one terminal event even when terminal trace persistence fails', async () => {
		appendRunMock.mockImplementation((_state, entry: { type?: string }) => {
			if (entry.type === 'run_finished') throw new Error('trace disk full');
		});
		const session = createSessionState();
		session.id = '11111111-1111-4111-8111-111111111111';
		const events = [];

		for await (const event of stream(
			{ location: '/workspace' },
			session,
			{
				runId: 'run',
				task: 'chat',
				message: 'request',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ tools: [] }
		)) events.push(event);

		expect(events.filter((event) => event.type === 'run_finished')).toHaveLength(1);
		expect(events.at(-1)?.type).toBe('run_finished');
	});
});
