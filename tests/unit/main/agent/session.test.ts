import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AgentSession } from '../../../../src/main/services/agent-session';

describe('AgentSession', () => {
	let location: string;

	beforeEach(async () => {
		location = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-agent-session-'));
	});

	afterEach(async () => {
		await fs.rm(location, { recursive: true, force: true });
	});

	it('loads persisted messages without appending a new user message', () => {
		const session = new AgentSession(
			{
				task: 'chat',
				message: 'hello',
				sessionId: 'home',
			},
			location
		);

		session.addAssistantMessage('hi', [
			{ id: 'tool-1', name: 'read', args: { path: 'notes.txt' } },
		]);
		session.addToolResults(
			[{ id: 'tool-1', name: 'read', args: { path: 'notes.txt' } }],
			[{ role: 'tool', toolUseId: 'tool-1', content: 'notes' }]
		);

		expect(AgentSession.loadMessages('home', location)).toEqual([
			{ role: 'user', content: 'hello' },
			{
				role: 'assistant',
				content: [{ type: 'text', text: 'hi' }],
				toolCalls: [{ id: 'tool-1', name: 'read', args: { path: 'notes.txt' } }],
			},
			{ role: 'tool', toolUseId: 'tool-1', content: 'notes' },
		]);
	});
});
