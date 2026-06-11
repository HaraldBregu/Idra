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

	it('stores named sessions in a uuid folder', async () => {
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

		expect(session.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
		const entries = await fs.readdir(path.join(location, 'sessions'), { withFileTypes: true });
		const entryNames = entries.map((entry) => entry.name);
		const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

		expect(entryNames).not.toContain('aliases.json');
		expect(folders).toEqual([session.id]);
		expect(folders).not.toContain('home');
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
