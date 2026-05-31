import path from 'node:path';
import { promises as fs } from 'node:fs';
import { acquireWriteLock } from '../../../../src/main/agent/session/lock';
import { sanitizeToolUseResultPairing } from '../../../../src/main/agent/session/repair';
import { clearSession, loadSession, saveSession, type SessionFile } from '../../../../src/main/agent/session/store';
import { makeTempDir } from '../test-helpers';

describe('session/repair', () => {
	it('drops orphan tool results and synthesizes missing results', () => {
		const repaired = sanitizeToolUseResultPairing([
			{ role: 'tool', toolUseId: 'orphan', content: [{ type: 'text', text: 'x' }] },
			{
				role: 'assistant',
				content: [{ type: 'tool_use', toolUseId: 'call1', toolName: 'read', toolArgs: {} }],
			},
		]);

		expect(repaired).toHaveLength(2);
		expect(repaired[1]).toMatchObject({ role: 'tool', toolUseId: 'call1', isError: true });
	});

	it('keeps valid tool call/result pairs and drops invalid extra results', () => {
		const repaired = sanitizeToolUseResultPairing([
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'checking' },
					{ type: 'tool_use', toolUseId: 'call1', toolName: 'read', toolArgs: {} },
					{ type: 'tool_use', toolUseId: 'call2', toolName: 'write', toolArgs: { path: 'a' } },
				],
			},
			{ role: 'tool', toolUseId: 'call2', content: [{ type: 'text', text: 'wrote' }] },
			{ role: 'tool', toolUseId: 'orphan', content: [{ type: 'text', text: 'x' }] },
			{ role: 'tool', toolUseId: 'call1', content: [{ type: 'text', text: 'read' }] },
		]);

		expect(repaired).toEqual([
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'checking' },
					{ type: 'tool_use', toolUseId: 'call1', toolName: 'read', toolArgs: {} },
					{ type: 'tool_use', toolUseId: 'call2', toolName: 'write', toolArgs: { path: 'a' } },
				],
			},
			{ role: 'tool', toolUseId: 'call1', content: [{ type: 'text', text: 'read' }], status: 'ok' },
			{ role: 'tool', toolUseId: 'call2', content: [{ type: 'text', text: 'wrote' }], status: 'ok' },
		]);
	});
});

describe('session/lock', () => {
	it('creates and releases an exclusive lock file', async () => {
		const dir = await makeTempDir();
		const target = path.join(dir, 'session.json');
		const lock = await acquireWriteLock(target, { timeoutMs: 100 });
		await expect(fs.access(`${target}.lock`)).resolves.toBeUndefined();
		await lock.release();
		await expect(fs.access(`${target}.lock`)).rejects.toThrow();
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('session/store', () => {
	it('loads missing sessions, saves atomically, repairs transcript on load, and clears', async () => {
		const baseDir = await makeTempDir();
		const created = await loadSession('abc', 'gpt-test', 'openai', { baseDir });
		expect(created).toMatchObject({ id: 'abc', model: 'gpt-test', provider: 'openai', transcript: [] });

		const file: SessionFile = {
			...created,
			transcript: [
				{
					role: 'assistant',
					content: [{ type: 'tool_use', toolUseId: 't1', toolName: 'read', toolArgs: {} }],
				},
			],
		};
		await saveSession(file, { baseDir });
		const reloaded = await loadSession('abc', 'ignored', 'ignored', { baseDir });
		expect(reloaded.transcript.map((entry) => entry.role)).toEqual(['assistant', 'tool']);

		await clearSession('abc', { baseDir });
		await expect(fs.access(path.join(baseDir, 'abc.json'))).rejects.toThrow();
		await fs.rm(baseDir, { recursive: true, force: true });
	});

	it('saves and loads structured agent tool calls with matching results', async () => {
		const baseDir = await makeTempDir();
		const created = await loadSession('tools', 'gpt-test', 'openai', { baseDir });
		const file: SessionFile = {
			...created,
			transcript: [
				{ role: 'user', content: 'read it' },
				{
					role: 'assistant',
					content: [
						{ type: 'text', text: 'I will read that.' },
						{
							type: 'tool_use',
							toolUseId: 'tool-1',
							toolName: 'read_file',
							toolArgs: { path: 'README.md' },
						},
					],
				},
				{
					role: 'tool',
					toolUseId: 'tool-1',
					isError: false,
					content: [{ type: 'text', text: 'contents' }],
				},
			],
		};

		await saveSession(file, { baseDir });
		const raw = JSON.parse(await fs.readFile(path.join(baseDir, 'tools.json'), 'utf8')) as SessionFile;
		const reloaded = await loadSession('tools', 'ignored', 'ignored', { baseDir });

		expect(raw.transcript[1]).toEqual(file.transcript[1]);
		expect(raw.transcript[2]).toEqual(file.transcript[2]);
		expect(reloaded.transcript).toEqual(file.transcript);
		await fs.rm(baseDir, { recursive: true, force: true });
	});
});
