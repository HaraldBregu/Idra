import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	WorkspaceMemorySearchManager,
	appendOnlyMemoryFlush,
	flushSessionMemoryBeforeCompaction,
	resolveMemoryFlushPlan,
} from '../../../src/main/memory-runtime';
import { saveSession, type SessionFile } from '../../../src/main/session/store';
import { createMemorySearchTool } from '../../../src/main/tools/memory';
import { sessionsHistoryTool } from '../../../src/main/tools/sessions';
import { makeTempDir, makeToolContext } from './test-helpers';

function session(id: string, transcript: SessionFile['transcript']): SessionFile {
	return {
		id,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		model: 'gpt-test',
		provider: 'openai',
		status: 'active',
		transcript,
		plan: [],
		compactionMarkers: [],
	};
}

describe('memory-runtime', () => {
	it('searches canonical memory files and rejects disallowed reads', async () => {
		const workspace = await makeTempDir();
		const outside = await makeTempDir();
		await fs.mkdir(path.join(workspace, 'memory'), { recursive: true });
		await fs.writeFile(path.join(workspace, 'MEMORY.md'), 'Project codename is Friday.\nUse concise answers.', 'utf8');
		await fs.writeFile(path.join(workspace, 'memory', '2026-01-01.md'), 'Daily note: migration TODO.', 'utf8');
		await fs.writeFile(path.join(workspace, 'memory.md'), 'legacy lowercase should be skipped', 'utf8');
		await fs.writeFile(path.join(outside, 'secret.md'), 'outside memory', 'utf8');

		const manager = new WorkspaceMemorySearchManager({ workspaceDir: workspace, includeSessions: false });
		// console.log('debug read', await manager.readFile('MEMORY.md', { lines: 2 }), await manager.search('codename', { minScore: 0 }));
		await expect(manager.search('codename')).resolves.toEqual([
			expect.objectContaining({ source: 'memory', text: expect.stringContaining('Friday') }),
		]);
		await expect(manager.search('legacy lowercase')).resolves.toEqual([]);
		await expect(manager.readFile('MEMORY.md', { lines: 1 })).resolves.toMatchObject({
			from: 1,
			lines: 1,
			truncated: true,
			text: expect.stringContaining('Project codename'),
		});
		await expect(manager.readFile(path.join(outside, 'secret.md'))).rejects.toThrow('outside allowed memory roots');

		if (process.platform !== 'win32') {
			await fs.symlink(path.join(outside, 'secret.md'), path.join(workspace, 'memory', 'escape.md'));
			await expect(manager.readFile('memory/escape.md')).rejects.toThrow('outside allowed memory roots');
		}

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(outside, { recursive: true, force: true });
	});

	it('indexes visible session transcripts with the configured visibility policy', async () => {
		const workspace = await makeTempDir();
		const sessionBaseDir = await makeTempDir();
		await saveSession(session('s1', [{ role: 'user', content: 'Alpha deployment decision.' }]), { baseDir: sessionBaseDir });
		await saveSession(session('s2', [{ role: 'user', content: 'Beta roadmap hidden from self visibility.' }]), { baseDir: sessionBaseDir });

		const selfOnly = new WorkspaceMemorySearchManager({
			workspaceDir: workspace,
			sessionBaseDir,
			currentSessionId: 's1',
			sessionVisibility: 'self',
		});
		await expect(selfOnly.search('Alpha', { source: 'sessions' })).resolves.toHaveLength(1);
		await expect(selfOnly.search('Beta', { source: 'sessions' })).resolves.toHaveLength(0);

		const agentVisible = new WorkspaceMemorySearchManager({
			workspaceDir: workspace,
			sessionBaseDir,
			currentSessionId: 's1',
			sessionVisibility: 'agent',
		});
		await expect(agentVisible.search('Beta', { source: 'sessions' })).resolves.toEqual([
			expect.objectContaining({ source: 'sessions', sessionId: 's2' }),
		]);

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('returns bounded sanitized session history through the session tool', async () => {
		const workspace = await makeTempDir();
		const sessionBaseDir = await makeTempDir();
		await saveSession(
			session('s1', [
				{ role: 'user', content: 'show image' },
				{
					role: 'tool',
					toolUseId: 't1',
					content: [
						{ type: 'image', mimeType: 'image/png', base64: 'abc123' },
						{ type: 'text', text: 'x'.repeat(5_000) },
					],
				},
			]),
			{ baseDir: sessionBaseDir }
		);

		const result = await sessionsHistoryTool.execute(
			{ sessionId: 's1', limit: 5, maxChars: 4_000 },
			makeToolContext({ workspace, sessionId: 's1', sessionBaseDir, sessionVisibility: 'self' })
		);

		const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
		expect(text).toContain('[image result omitted');
		expect(text).not.toContain('abc123');
		expect(text.length).toBeLessThan(4_500);

		await fs.rm(workspace, { recursive: true, force: true });
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});

	it('flushes pre-compaction memory append-only to the planned daily file', async () => {
		const workspace = await makeTempDir();
		const file = session('s1', [{ role: 'user', content: 'Remember the launch decision for Project Friday.' }]);
		const clock = () => new Date('2026-02-03T10:00:00.000Z');

		await expect(flushSessionMemoryBeforeCompaction(file, workspace, { clock })).resolves.toMatchObject({
			status: 'flushed',
			targetPath: path.join(workspace, 'memory', '2026-02-03.md'),
		});
		await expect(flushSessionMemoryBeforeCompaction(file, workspace, { clock })).resolves.toMatchObject({
			status: 'skipped',
			reason: 'already_flushed',
		});
		await expect(fs.readFile(path.join(workspace, 'memory', '2026-02-03.md'), 'utf8')).resolves.toContain(
			'launch decision'
		);

		const plan = resolveMemoryFlushPlan(workspace, clock);
		await expect(
			appendOnlyMemoryFlush({ ...plan, relativePath: 'MEMORY.md' }, 'bad')
		).rejects.toThrow('memory/YYYY-MM-DD.md');

		await fs.rm(workspace, { recursive: true, force: true });
	});

	it('returns structured unavailable payloads when memory search is disabled', async () => {
		const workspace = await makeTempDir();
		const tool = createMemorySearchTool({ enabled: false });
		const result = await tool.execute({ query: 'anything' }, makeToolContext({ workspace }));
		expect(result.status).toBe('ok');
		expect(result.details).toMatchObject({
			status: 'unavailable',
			reason: 'memory search is disabled',
		});
		await fs.rm(workspace, { recursive: true, force: true });
	});
});
