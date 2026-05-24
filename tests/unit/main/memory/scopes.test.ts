import path from 'node:path';
import {
	createMemoryScopeId,
	describeMemoryFile,
	normalizeMemoryScopeId,
	resolveDailyMemoryTarget,
	resolveMemoryScope,
	validateDailyMemoryRelativePath,
} from '../../../../src/main/memory/scopes';

describe('memory scopes', () => {
	it('normalizes unsafe external identifiers into filesystem-safe scope ids', () => {
		const id = normalizeMemoryScopeId('slack/team:room/../../secret');
		expect(id).toMatch(/^[a-z0-9._-]+-[a-f0-9]{8}$/);
		expect(id).not.toContain('..');
		expect(id).not.toContain('/');
	});

	it('resolves stable directories for chat, task, cron, and global scopes', () => {
		expect(resolveMemoryScope({ kind: 'global' })).toMatchObject({
			kind: 'global',
			id: 'global',
			relativeDir: 'memory',
		});
		expect(resolveMemoryScope({ kind: 'chat', id: 'chat-a' })).toMatchObject({
			kind: 'chat',
			id: 'chat-a',
			relativeDir: path.join('memory', 'chats', 'chat-a'),
		});
		expect(resolveMemoryScope({ kind: 'task', taskId: 'task:abc' })).toMatchObject({
			kind: 'task',
			relativeDir: expect.stringContaining(path.join('memory', 'tasks')),
		});
		expect(resolveMemoryScope({ kind: 'cron', jobId: 'daily-summary' })).toMatchObject({
			kind: 'cron',
			id: 'daily-summary',
			relativeDir: path.join('memory', 'cron', 'daily-summary'),
		});
	});

	it('builds guarded daily memory targets', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		const target = resolveDailyMemoryTarget(
			workspace,
			{ kind: 'chat', id: 'chat-a' },
			'2026-05-24'
		);

		expect(target.relativePath).toBe(path.join('memory', 'chats', 'chat-a', '2026-05-24.md'));
		expect(target.targetPath).toBe(path.join(workspace, target.relativePath));
		expect(() => resolveDailyMemoryTarget(workspace, { kind: 'global' }, '2026/05/24')).toThrow(
			'YYYY-MM-DD'
		);
	});

	it('classifies memory files by corpus and scope', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		expect(describeMemoryFile(workspace, path.join(workspace, 'MEMORY.md'))).toMatchObject({
			corpus: 'memory',
			scopeKind: 'global',
			scopeId: 'global',
		});
		expect(
			describeMemoryFile(workspace, path.join(workspace, 'memory', 'chats', 'chat-a', 'note.md'))
		).toMatchObject({
			corpus: 'memory',
			scopeKind: 'chat',
			scopeId: 'chat-a',
		});
		expect(describeMemoryFile(workspace, path.join(workspace, 'memory', 'rag', 'source.md'))).toMatchObject({
			corpus: 'rag',
			scopeKind: 'global',
			scopeId: 'rag',
		});
		expect(describeMemoryFile(workspace, path.join(workspace, 'memory', 'wiki', 'index.md'))).toMatchObject({
			corpus: 'wiki',
			scopeKind: 'global',
			scopeId: 'wiki',
		});
	});

	it('rejects unsafe daily memory relative paths', () => {
		expect(() => validateDailyMemoryRelativePath(path.join('memory', '2026-05-24.md'))).not.toThrow();
		expect(() => validateDailyMemoryRelativePath(path.join('memory', 'chats', 'chat-a', '2026-05-24.md'))).not.toThrow();
		expect(() => validateDailyMemoryRelativePath('../memory/2026-05-24.md')).toThrow('inside the workspace');
		expect(() => validateDailyMemoryRelativePath('MEMORY.md')).toThrow('memory/YYYY-MM-DD.md');
	});

	it('creates stable ids for the same route parts', () => {
		expect(createMemoryScopeId(['slack', 'team-a', 'room-a'])).toBe(
			createMemoryScopeId(['slack', 'team-a', 'room-a'])
		);
	});
});
