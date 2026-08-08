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
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import { respondToolPermission } from '../../../../../src/main/agent/policy';

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
			expect(session.context.toolsContext.hasPrivateContext).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('caps public web calls only for bot-origin runs', async () => {
		const calls = Array.from({ length: 9 }, (_, index) => ({
			id: `web-${index}`,
			name: 'web_search',
			args: { query: `query ${index}` },
		}));
		const search = jest.fn().mockResolvedValue('public result');
		const webTool = jsonTool({
			name: 'web_search',
			description: 'public web search',
			defaultPermission: 'allow',
			risk: 'medium',
			effect: 'external',
			schema: { type: 'object' },
			execute: search,
		});
		runModelTurnMock.mockImplementationOnce(async function* () {
			return { content: '', model: 'test-model', toolCalls: calls };
		});
		const botEvents = [];
		const botSession = createSessionState();
		botSession.messages = [{ role: 'user', content: 'public current-events question' }];
		for await (const event of stream(
			{ location: '/workspace' },
			botSession,
			{
				runId: 'bot-run',
				task: 'chat',
				message: 'search',
				model: 'test-model',
				origin: 'bot',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ tools: [webTool], interactive: false }
		))
			botEvents.push(event);
		expect(search).not.toHaveBeenCalled();
		expect(botEvents.at(-1)).toMatchObject({
			type: 'run_finished',
			result: { stopReason: 'budget_exhausted' },
		});

		runModelTurnMock
			.mockImplementationOnce(async function* () {
				return { content: '', model: 'test-model', toolCalls: calls };
			})
			.mockImplementationOnce(successfulTurn);
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'main-run',
				task: 'chat',
				message: 'search',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ tools: [webTool], interactive: false }
		))
			void event;
		expect(search).toHaveBeenCalledTimes(9);
	});

	it('hard-gates public web egress after main minimal-context user text', async () => {
		const session = createSessionState();
		session.messages = [{ role: 'user', content: 'my pasted access code is private' }];
		const search = jest.fn().mockResolvedValue('public result');
		const webTool = jsonTool({
			name: 'web_search',
			description: 'public web search',
			defaultPermission: 'allow',
			risk: 'medium',
			effect: 'external',
			schema: { type: 'object' },
			execute: search,
		});
		runModelTurnMock.mockImplementationOnce(async function* () {
			return {
				content: '',
				model: 'test-model',
				toolCalls: [{ id: 'egress', name: 'web_search', args: { query: 'private code' } }],
			};
		});
		const events = stream(
			{ location: '/workspace' },
			session,
			{
				runId: 'private-main',
				task: 'chat',
				message: 'private',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ tools: [webTool], interactive: true }
		);
		expect((await events.next()).value).toMatchObject({ type: 'run_started' });
		expect((await events.next()).value).toMatchObject({ type: 'assistant_message' });
		expect((await events.next()).value).toMatchObject({ type: 'tool_call_start' });
		const request = (await events.next()).value;
		expect(request).toMatchObject({ type: 'tool_permission_request', hardApproval: true });
		if (!request || request.type !== 'tool_permission_request') throw new Error('Expected approval');
		const end = events.next();
		expect(respondToolPermission(request.approvalId, 'reject')).toBe(true);
		expect((await end).value).toMatchObject({ type: 'tool_call_end', isError: true });
		expect(search).not.toHaveBeenCalled();
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
		))
			events.push(event);

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
			))
				events.push(event);
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
		))
			events.push(event);

		expect(events.filter((event) => event.type === 'run_finished')).toHaveLength(1);
		expect(events.at(-1)?.type).toBe('run_finished');
	});
});
