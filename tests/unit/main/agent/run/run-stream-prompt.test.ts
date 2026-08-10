import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const successfulTurn = async function* () {
	yield* [];
	return { content: 'done', model: 'test-model', toolCalls: [] };
};
const runModelTurnMock = jest.fn(successfulTurn);
const appendRunMock = jest.fn();
const closeMcpMock = jest.fn();
const createSkillRegistrySnapshotMock = jest.fn(() => ({ skills: [], diagnostics: [] }));
const activateSkillMock = jest.fn();

jest.mock('../../../../../src/main/settings_store', () => ({
	getModelId: jest.fn(() => 'test-model'),
	getResolvedProvider: jest.fn(() => ({ id: 'test-provider', apiKey: 'key' })),
}));

jest.mock('../../../../../src/main/agent/runner/run_model_turn', () => ({
	runModelTurn: (...args: unknown[]) => runModelTurnMock(...args),
}));

jest.mock('../../../../../src/main/agent/session/session_append_run', () => ({
	appendRun: (...args: unknown[]) => appendRunMock(...args),
}));

jest.mock('../../../../../src/main/agent/tools/mcp/loader', () => ({
	loadMcpTools: jest.fn(async () => ({ tools: [], close: closeMcpMock })),
}));

jest.mock('../../../../../src/main/agent/skills', () => ({
	createSkillRegistrySnapshot: () => createSkillRegistrySnapshotMock(),
	activateSkill: (...args: unknown[]) => activateSkillMock(...args),
}));

import { stream } from '../../../../../src/main/agent/runner/run_stream';
import { createSessionState } from '../../../../../src/main/agent/session';
import type { Message } from '../../../../../src/main/agent/types';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';
import { respondToolPermission } from '../../../../../src/main/agent/permissions';

describe('run stream system prompt', () => {
	beforeEach(() => {
		runModelTurnMock.mockReset().mockImplementation(successfulTurn);
		appendRunMock.mockReset();
		closeMcpMock.mockReset();
		createSkillRegistrySnapshotMock.mockReset().mockReturnValue({ skills: [], diagnostics: [] });
		activateSkillMock.mockReset();
	});

	const registrySkill = {
		id: 'writer',
		name: 'writer',
		description: 'Draft polished documents',
		location: '/canonical/skills/writer',
		folderPath: '/canonical/skills/writer',
		manifest: { name: 'writer', description: 'Draft polished documents', allowedTools: ['read'] },
		enabled: true,
		invocationPolicy: 'implicit',
		source: 'local-filesystem',
		trust: 'user-controlled',
		hash: 'writer-hash',
	} as const;
	const activatedSkill = {
		id: 'writer',
		name: 'writer',
		canonicalRoot: '/canonical/skills/writer',
		instructions: 'EXACT WRITER INSTRUCTIONS',
		source: 'local-filesystem',
		trust: 'user-controlled',
		hash: 'writer-hash',
		allowedTools: ['read'],
		resources: ['references/style.md'],
		warnings: [],
	} as const;

	it.each(['minimal', 'workspace'] as const)(
		'injects an explicitly selected skill before the first %s model turn',
		async (contextMode) => {
			const root = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-explicit-skill-'));
			createSkillRegistrySnapshotMock.mockReturnValue({ skills: [registrySkill], diagnostics: [] });
			activateSkillMock.mockResolvedValue(activatedSkill);
			const session = createSessionState();
			session.messages = [{ role: 'user', content: 'Draft this' }];
			try {
				for await (const event of stream(
					{ location: root },
					session,
					{
						runId: `explicit-${contextMode}`,
						task: 'chat',
						message: 'Draft this',
						model: 'test-model',
						origin: 'main',
						contextMode,
						explicitSkill: 'writer',
					},
					new AbortController().signal,
					{ tools: [] }
				))
					void event;

				expect(activateSkillMock).toHaveBeenCalledWith(
					expect.objectContaining({ skills: [registrySkill] }),
					'writer'
				);
				const protectedPrompt = runModelTurnMock.mock.calls[0][9] as string;
				expect(protectedPrompt).toContain('EXACT WRITER INSTRUCTIONS');
				expect(protectedPrompt).toContain('"canonicalRoot":"/canonical/skills/writer"');
				expect(protectedPrompt).toContain('references/style.md');
			} finally {
				await fs.rm(root, { recursive: true, force: true });
			}
		}
	);

	it('loads an implicit skill in minimal mode without transporting its body through tool output', async () => {
		createSkillRegistrySnapshotMock.mockReturnValue({ skills: [registrySkill], diagnostics: [] });
		activateSkillMock.mockResolvedValue(activatedSkill);
		runModelTurnMock
			.mockImplementationOnce(async function* () {
				yield* [];
				return {
					content: '',
					model: 'test-model',
					toolCalls: [{ id: 'load', name: 'load_skill', args: { name: 'writer' } }],
				};
			})
			.mockImplementationOnce(successfulTurn);
		const session = createSessionState();
		session.messages = [{ role: 'user', content: 'Draft this' }];
		for await (const event of stream(
			{ location: '/workspace' },
			session,
			{
				runId: 'implicit-minimal',
				task: 'chat',
				message: 'Draft this',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ interactive: false }
		))
			void event;

		expect(runModelTurnMock.mock.calls[0][10]).toEqual([
			expect.objectContaining({ content: expect.stringContaining('Draft polished documents') }),
		]);
		expect(runModelTurnMock.mock.calls[1][9]).toContain('EXACT WRITER INSTRUCTIONS');
		const receipt = session.messages.find(
			(message) => message.toolCalls?.[0]?.name === 'load_skill'
		)?.toolCalls?.[0]?.result?.content;
		expect(receipt).toContain('"activated":true');
		expect(receipt).not.toContain('EXACT WRITER INSTRUCTIONS');
	});

	it('surfaces explicit activation errors before model inference', async () => {
		createSkillRegistrySnapshotMock.mockReturnValue({ skills: [], diagnostics: [] });
		activateSkillMock.mockRejectedValue(
			new Error('Skill "missing" was not found in this run\'s registry.')
		);
		const events = [];
		await expect(async () => {
			for await (const event of stream(
				{ location: '/workspace' },
				createSessionState(),
				{
					runId: 'missing',
					task: 'chat',
					message: 'request',
					model: 'test-model',
					origin: 'main',
					contextMode: 'minimal',
					explicitSkill: 'missing',
				},
				new AbortController().signal,
				{ tools: [] }
			))
				events.push(event);
		}).rejects.toThrow('not found');
		expect(events).toContainEqual(
			expect.objectContaining({ type: 'run_error', message: expect.stringContaining('not found') })
		);
		expect(runModelTurnMock).not.toHaveBeenCalled();
	});

	it('omits the activation tool when the registry has no implicit skills', async () => {
		const events = [];
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'empty-skills',
				task: 'chat',
				message: 'request',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal
		))
			events.push(event);
		expect(events[0]).toMatchObject({ type: 'run_started' });
		if (events[0]?.type !== 'run_started') throw new Error('Expected run_started');
		expect(events[0].tools).not.toContain('load_skill');
	});

	it('keeps mutation tools unavailable to bot runs by default', async () => {
		const events = [];
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'bot-file-tools',
				task: 'chat',
				message: 'create a file',
				model: 'test-model',
				origin: 'bot',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ interactive: false }
		))
			events.push(event);

		expect(events[0]).toMatchObject({ type: 'run_started' });
		if (events[0]?.type !== 'run_started') throw new Error('Expected run_started');
		expect(events[0].tools).toContain('web_fetch');
		expect(events[0].tools).not.toEqual(
			expect.arrayContaining(['write', 'edit', 'apply_patch', 'exec', 'create_schedule'])
		);
	});

	it('exposes task-compatible tools when a background task has no allowlist', async () => {
		const events = [];
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'background-task-tools',
				task: 'chat',
				message: 'perform the scheduled work',
				model: 'test-model',
				origin: 'task',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{ interactive: false }
		))
			events.push(event);

		expect(events[0]).toMatchObject({ type: 'run_started' });
		if (events[0]?.type !== 'run_started') throw new Error('Expected run_started');
		expect(events[0].tools).toEqual(
			expect.arrayContaining(['read', 'write', 'edit', 'apply_patch', 'exec', 'process'])
		);
	});

	it('applies main toolsAllow and toolsDeny to the subagent tool', async () => {
		const noTools = [];
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'allow-none',
				task: 'chat',
				message: 'answer directly',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
				toolsAllow: [],
			},
			new AbortController().signal
		))
			noTools.push(event);
		expect(noTools[0]).toMatchObject({ type: 'run_started', tools: [] });

		const denied = [];
		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'deny-subagent',
				task: 'chat',
				message: 'use native tools',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
				toolsDeny: ['subagent'],
			},
			new AbortController().signal
		))
			denied.push(event);
		expect(denied[0]).toMatchObject({ type: 'run_started' });
		if (denied[0]?.type !== 'run_started') throw new Error('Expected run_started');
		expect(denied[0].tools).toContain('read');
		expect(denied[0].tools).not.toContain('subagent');
		expect(closeMcpMock).toHaveBeenCalledTimes(2);
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
			const contextMessages = runModelTurnMock.mock.calls[0][10] as Message[];
			expect(systemPrompt).not.toContain('Alice');
			expect(systemPrompt).not.toContain('Private preference');
			expect(contextMessages[0]).toMatchObject({
				role: 'user',
				content: expect.stringContaining('- **Name:** Alice'),
			});
			expect(contextMessages[0].content).toEqual(expect.stringContaining('- Private preference'));
			expect(messages[0]).toEqual({ role: 'user', content: 'Current request' });
			expect(session.context.toolsContext.hasPrivateContext).toBe(true);
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('uses an injected bypass mode for a non-interactive run', async () => {
		const execute = jest.fn().mockResolvedValue('done');
		const webTool = jsonTool({
			name: 'web_search',
			description: 'public web search',
			defaultPermission: 'ask',
			schema: { type: 'object' },
			execute,
		});
		runModelTurnMock.mockImplementationOnce(async function* () {
			yield* [];
			return {
				content: '',
				model: 'test-model',
				toolCalls: [{ id: 'web', name: webTool.name, args: { query: 'news' } }],
			};
		});

		for await (const event of stream(
			{ location: '/workspace' },
			createSessionState(),
			{
				runId: 'background-bypass',
				task: 'chat',
				message: 'search',
				model: 'test-model',
				origin: 'main',
				contextMode: 'minimal',
			},
			new AbortController().signal,
			{
				tools: [webTool],
				interactive: false,
				permissions: {
					mode: 'bypass',
					dir: {},
					web_search: { default: 'ask', allow: [], deny: [], ask: [] },
				},
			}
		))
			void event;

		expect(execute).toHaveBeenCalledTimes(1);
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
			yield* [];
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
				yield* [];
				return { content: '', model: 'test-model', toolCalls: calls };
			})
			.mockImplementationOnce(successfulTurn);
		const mainSession = createSessionState();
		mainSession.messages = [{ role: 'user', content: 'public current-events question' }];
		for await (const event of stream(
			{ location: '/workspace' },
			mainSession,
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
			yield* [];
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
