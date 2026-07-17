const getDefaultMode = jest.fn();
const getPathPermissions = jest.fn();
const getPermissionRules = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getDefaultMode,
	getPathPermissions,
	getPermissionRules,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';

const noRules = { allow: [] as string[], deny: [] as string[], ask: [] as string[] };

const rule = (path: string, allow: string[], deny: string[], ask: string[] = []) => ({
	path,
	allow,
	deny,
	ask,
	recursive: true,
});

beforeEach(() => {
	getDefaultMode.mockReset().mockReturnValue('ask');
	getPathPermissions.mockReset().mockReturnValue([]);
	getPermissionRules.mockReset().mockReturnValue(noRules);
});

describe('resolveToolPermission', () => {
	it('allows every targeted tool inside the agent directory', () => {
		getDefaultMode.mockReturnValue('deny');
		getPathPermissions.mockReturnValue([rule('/appdata/agent', [], ['*'])]);
		getPermissionRules.mockReturnValue({
			allow: [],
			deny: ['Read(/appdata/agent/secret.txt)', 'Bash(rm -rf *)'],
			ask: [],
		});

		expect(resolveToolPermission('read', { path: '/appdata/agent/secret.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/appdata/agent/new.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/appdata/agent/config/a.txt' })).toBe('allow');
		expect(
			resolveToolPermission('exec', {
				command: 'rm -rf *',
				workdir: '/appdata/agent/work',
			}),
		).toBe('allow');
		expect(
			resolveToolPermission('apply_patch', {
				input: '*** Update File: /appdata/agent/a.ts',
			}),
		).toBe('allow');
		expect(getDefaultMode).not.toHaveBeenCalled();
	});

	it('asks for every targeted tool outside the agent directory', () => {
		expect(resolveToolPermission('read', { path: '/outside/a.txt' })).toBe('ask');
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('ask');
		expect(resolveToolPermission('edit', { path: '/x' })).toBe('ask');
		expect(resolveToolPermission('exec', { command: 'rm -rf build', workdir: '/x' })).toBe('ask');
		expect(resolveToolPermission('exec', { command: 'ls -la', workdir: '/x' })).toBe('ask');
		expect(resolveToolPermission('apply_patch', { input: '*** Add File: /outside/a.ts' })).toBe(
			'ask',
		);
		expect(resolveToolPermission('read', { path: '/appdata/agent-other/a.txt' })).toBe('ask');
	});

	it('asks when any apply_patch target is outside the agent directory', () => {
		const input = [
			'*** Update File: /appdata/agent/a.ts',
			'*** Update File: /outside/b.ts',
		].join('\n');
		expect(resolveToolPermission('apply_patch', { input })).toBe('ask');
	});

	it('allows tools that have no filesystem target', () => {
		expect(resolveToolPermission('web_search', { query: 'Friday' })).toBe('allow');
		expect(getDefaultMode).not.toHaveBeenCalled();
	});
});

describe('path permissions', () => {
	it('a deny "*" rule blocks every tool, read included', () => {
		getPathPermissions.mockReturnValue([rule('/secret', [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/secret' })).toBe('deny');
	});

	it('accepts the bare "*" string form for a selector', () => {
		getPathPermissions.mockReturnValue([
			{ path: '/secret', allow: [], deny: '*', ask: [], recursive: true },
		]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('deny');
	});

	it('applies to the whole subtree', () => {
		getPathPermissions.mockReturnValue([rule('/secret', [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/secret/deep/a.txt' })).toBe('deny');
	});

	it('denies only the listed tools, others fall through', () => {
		getPathPermissions.mockReturnValue([rule('/repo', [], ['write'])]);
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/repo/a.txt' })).toBe('ask');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/repo' })).toBe('ask');
	});

	it('an allow rule lets a destructive tool through even when the default asks', () => {
		getDefaultMode.mockReturnValue('ask');
		getPathPermissions.mockReturnValue([rule('/trusted', ['edit'], [])]);
		expect(resolveToolPermission('edit', { path: '/trusted/a.txt' })).toBe('allow');
	});

	it('an allow-"*" folder frees every tool there, destructive exec included', () => {
		getDefaultMode.mockReturnValue('ask');
		getPathPermissions.mockReturnValue([rule('/trusted', ['*'], [])]);
		expect(resolveToolPermission('edit', { path: '/trusted/a.txt' })).toBe('allow');
		expect(resolveToolPermission('exec', { command: 'rm -rf build', workdir: '/trusted' })).toBe(
			'allow',
		);
	});

	it('an ask rule forces a prompt even for an ungated tool', () => {
		getPathPermissions.mockReturnValue([rule('/watched', [], [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/watched/a.txt' })).toBe('ask');
	});

	it('deny wins over ask wins over allow within a rule', () => {
		getPathPermissions.mockReturnValue([rule('/repo', ['*'], ['write'], ['read'])]);
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/repo/a.txt' })).toBe('ask');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/repo' })).toBe('allow');
	});

	it('a non-recursive rule matches only the directory itself', () => {
		getPathPermissions.mockReturnValue([
			{ path: '/secret', allow: [], deny: ['*'], ask: [], recursive: false },
		]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/secret/sub/a.txt' })).toBe('ask');
	});

	it('the deepest matching rule wins', () => {
		getPathPermissions.mockReturnValue([
			rule('/repo', [], ['*']),
			rule('/repo/pub', ['*'], []),
		]);
		expect(resolveToolPermission('write', { path: '/repo/pub/a.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
	});
});

describe('Tool(pattern) rules', () => {
	it('denies a shell command matched by a Bash(...) deny rule', () => {
		getPermissionRules.mockReturnValue({ ...noRules, deny: ['Bash(rm -rf /)'] });
		expect(resolveToolPermission('exec', { command: 'rm -rf /', workdir: '/x' })).toBe('deny');
	});

	it('allows an exact Bash(...) command over an asking default', () => {
		getDefaultMode.mockReturnValue('ask');
		getPermissionRules.mockReturnValue({ ...noRules, allow: ['Bash(rm -rf node_modules)'] });
		expect(resolveToolPermission('exec', { command: 'rm -rf node_modules', workdir: '/x' })).toBe(
			'allow',
		);
	});

	it('matches a ":*" prefix wildcard on the command', () => {
		getPermissionRules.mockReturnValue({ ...noRules, ask: ['Bash(git push:*)'] });
		expect(resolveToolPermission('exec', { command: 'git push origin main', workdir: '/x' })).toBe(
			'ask',
		);
	});

	it('anchors the ":*" wildcard at an argument boundary', () => {
		getPermissionRules.mockReturnValue({ ...noRules, deny: ['Bash(git:*)'] });
		expect(resolveToolPermission('exec', { command: 'git', workdir: '/x' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'git status', workdir: '/x' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'git-evil --root', workdir: '/x' })).toBe('ask');
	});

	it('anchors path-rule wildcards at a path separator', () => {
		getPermissionRules.mockReturnValue({ ...noRules, deny: ['Read(/home/alice:*)'] });
		expect(resolveToolPermission('read', { path: '/home/alice/secret' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/home/alice-other/secret' })).toBe('ask');
	});

	it('keys path tools by their path, e.g. Read(...)', () => {
		getPermissionRules.mockReturnValue({ ...noRules, deny: ['Read(/etc/passwd)'] });
		expect(resolveToolPermission('read', { path: '/etc/passwd' })).toBe('deny');
	});

	it('a path default overrides a rule', () => {
		getPermissionRules.mockReturnValue({ ...noRules, allow: ['Read(/secret/a.txt)'] });
		getPathPermissions.mockReturnValue([rule('/secret', [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
	});
});
