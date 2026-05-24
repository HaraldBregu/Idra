import path from 'node:path';
import {
	describeChatMemoryFile,
	resolveChatDailyMemoryTarget,
	resolveChatMemoryScope,
	validateChatDailyMemoryRelativePath,
} from '../../../../src/main/memory';

describe('chat memory module', () => {
	it('normalizes unsafe chat identifiers into filesystem-safe scope ids', () => {
		const scope = resolveChatMemoryScope({ kind: 'chat', id: 'slack/team:room/../../secret' });
		expect(scope.id).toMatch(/^[a-z0-9._-]+-[a-f0-9]{8}$/);
		expect(scope.id).not.toContain('..');
		expect(scope.id).not.toContain('/');
	});

	it('resolves global and chat memory directories', () => {
		expect(resolveChatMemoryScope({ kind: 'global' })).toMatchObject({
			kind: 'global',
			id: 'global',
			relativeDir: 'memory',
		});
		expect(resolveChatMemoryScope({ kind: 'chat', id: 'chat-a' })).toMatchObject({
			kind: 'chat',
			id: 'chat-a',
			relativeDir: path.join('memory', 'chats', 'chat-a'),
		});
	});

	it('builds guarded chat daily memory targets', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		const target = resolveChatDailyMemoryTarget(
			workspace,
			{ kind: 'chat', id: 'chat-a' },
			'2026-05-24'
		);

		expect(target.relativePath).toBe(path.join('memory', 'chats', 'chat-a', '2026-05-24.md'));
		expect(target.targetPath).toBe(path.join(workspace, target.relativePath));
		expect(() => resolveChatDailyMemoryTarget(workspace, { kind: 'global' }, '2026/05/24')).toThrow(
			'YYYY-MM-DD'
		);
	});

	it('classifies only global and chat memory files', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		expect(describeChatMemoryFile(workspace, path.join(workspace, 'MEMORY.md'))).toMatchObject({
			corpus: 'memory',
			scopeKind: 'global',
			scopeId: 'global',
		});
		expect(
			describeChatMemoryFile(workspace, path.join(workspace, 'memory', 'chats', 'chat-a', 'note.md'))
		).toMatchObject({
			corpus: 'memory',
			scopeKind: 'chat',
			scopeId: 'chat-a',
		});
		expect(describeChatMemoryFile(workspace, path.join(workspace, 'memory', 'rag', 'source.md'))).toBeUndefined();
		expect(describeChatMemoryFile(workspace, path.join(workspace, 'memory', 'wiki', 'index.md'))).toBeUndefined();
	});

	it('rejects non-chat daily memory relative paths', () => {
		expect(() => validateChatDailyMemoryRelativePath(path.join('memory', '2026-05-24.md'))).not.toThrow();
		expect(() => validateChatDailyMemoryRelativePath(path.join('memory', 'chats', 'chat-a', '2026-05-24.md'))).not.toThrow();
		expect(() => validateChatDailyMemoryRelativePath('../memory/2026-05-24.md')).toThrow('inside the workspace');
		expect(() => validateChatDailyMemoryRelativePath(path.join('memory', 'tasks', 'task-a', '2026-05-24.md'))).toThrow('memory/chats');
		expect(() => validateChatDailyMemoryRelativePath(path.join('memory', 'rag', '2026-05-24.md'))).toThrow('memory/chats');
		expect(() => validateChatDailyMemoryRelativePath('MEMORY.md')).toThrow('memory/YYYY-MM-DD.md');
	});
});
