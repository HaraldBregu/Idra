const getToolPermission = jest.fn();
const getToolAllowedPaths = jest.fn();
const getToolAllowedCommands = jest.fn();
const getPathPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	getToolPermission,
	getToolAllowedPaths,
	getToolAllowedCommands,
	getPathPermissions,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';

const rule = (path: string, allow: string[], deny: string[], ask: string[] = []) => ({
	path,
	allow,
	deny,
	ask,
	recursive: true,
});

beforeEach(() => {
	getToolPermission.mockReset();
	getToolAllowedPaths.mockReset().mockReturnValue([]);
	getToolAllowedCommands.mockReset().mockReturnValue([]);
	getPathPermissions.mockReset().mockReturnValue([]);
});

describe('resolveToolPermission', () => {
	it('allows ungated tools outright', () => {
		expect(resolveToolPermission('read', { path: '/etc/passwd' })).toBe('allow');
		expect(getToolPermission).not.toHaveBeenCalled();
	});

	it('returns the stored mode when it is not "ask"', () => {
		getToolPermission.mockReturnValue('deny');
		expect(resolveToolPermission('write', { path: '/x' })).toBe('deny');
	});

	it('asks when a target is not allowlisted', () => {
		getToolPermission.mockReturnValue('ask');
		getToolAllowedPaths.mockReturnValue([]);
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('ask');
	});

	it('allows a target that is within an allowlisted path', () => {
		getToolPermission.mockReturnValue('ask');
		getToolAllowedPaths.mockReturnValue(['/outside']);
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('allow');
	});

	it('asks for exec when the command is not allowlisted, even if the dir is', () => {
		getToolPermission.mockReturnValue('ask');
		getToolAllowedPaths.mockReturnValue(['/work']);
		getToolAllowedCommands.mockReturnValue([]);
		expect(resolveToolPermission('exec', { command: 'rm -rf /', workdir: '/work' })).toBe('ask');
	});

	it('allows exec when both command and dir are allowlisted', () => {
		getToolPermission.mockReturnValue('ask');
		getToolAllowedPaths.mockReturnValue(['/work']);
		getToolAllowedCommands.mockReturnValue(['git']);
		expect(resolveToolPermission('exec', { command: 'git status', workdir: '/work' })).toBe('allow');
	});
});

describe('path permissions', () => {
	it('a deny "*" rule blocks every tool, read included', () => {
		getPathPermissions.mockReturnValue([rule('/secret', [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/secret' })).toBe('deny');
	});

	it('applies to the whole subtree', () => {
		getPathPermissions.mockReturnValue([rule('/secret', [], ['*'])]);
		expect(resolveToolPermission('read', { path: '/secret/deep/a.txt' })).toBe('deny');
	});

	it('denies only the listed tools, others fall through', () => {
		getToolPermission.mockReturnValue('allow');
		getPathPermissions.mockReturnValue([rule('/repo', [], ['write', 'edit'])]);
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/repo/a.txt' })).toBe('allow');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/repo' })).toBe('allow');
	});

	it('an allow rule lets a gated tool through without asking', () => {
		getToolPermission.mockReturnValue('ask');
		getPathPermissions.mockReturnValue([rule('/trusted', ['write'], [])]);
		expect(resolveToolPermission('write', { path: '/trusted/a.txt' })).toBe('allow');
	});

	it('deny wins over allow within a rule', () => {
		getPathPermissions.mockReturnValue([rule('/repo', ['*'], ['write'])]);
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/repo/a.txt' })).toBe('allow');
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
