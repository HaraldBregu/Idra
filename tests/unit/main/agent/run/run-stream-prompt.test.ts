import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const runModelTurnMock = jest.fn(async function* () {
	yield* [];
	return { content: 'done', model: 'test-model', toolCalls: [] };
});

jest.mock('../../../../../src/main/settings_store', () => ({
	getModelId: jest.fn(() => 'test-model'),
	getResolvedProvider: jest.fn(() => ({ id: 'test-provider', apiKey: 'key' })),
}));

jest.mock('../../../../../src/main/agent/run/run_model_turn', () => ({
	runModelTurn: (...args: unknown[]) => runModelTurnMock(...args),
}));

jest.mock('../../../../../src/main/agent/skills', () => ({
	listSkills: jest.fn(() => []),
}));

import { stream } from '../../../../../src/main/agent/run/run_stream';
import { createSessionState } from '../../../../../src/main/agent/session';
import type { Message } from '../../../../../src/main/agent/types';

describe('run stream system prompt', () => {
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
				{ task: 'chat', message: 'Current request', model: 'test-model' },
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
});
