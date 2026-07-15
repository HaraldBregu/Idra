const getToolPermission = jest.fn();
const getToolAllowedPaths = jest.fn();
const getToolAllowedCommands = jest.fn();
const getPathModes = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	getToolPermission,
	getToolAllowedPaths,
	getToolAllowedCommands,
	getPathModes,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';

beforeEach(() => {
	getToolPermission.mockReset();
	getToolAllowedPaths.mockReset().mockReturnValue([]);
	getToolAllowedCommands.mockReset().mockReturnValue([]);
	getPathModes.mockReset().mockReturnValue([]);
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

describe('path modes', () => {
	it('denies every tool inside a deny path, read included', () => {
		getPathModes.mockReturnValue([{ path: '/secret', mode: 'deny', recursive: true }]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'ls', workdir: '/secret' })).toBe('deny');
	});

	it('recursive rule covers nested directories', () => {
		getPathModes.mockReturnValue([{ path: '/secret', mode: 'deny', recursive: true }]);
		expect(resolveToolPermission('read', { path: '/secret/deep/a.txt' })).toBe('deny');
	});

	it('non-recursive rule matches only direct contents', () => {
		getToolPermission.mockReturnValue('allow');
		getPathModes.mockReturnValue([{ path: '/secret', mode: 'deny', recursive: false }]);
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/secret/sub/a.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/secret/sub/a.txt' })).toBe('allow');
	});

	it('a deny rule overrides a stored allow mode and allowlisted paths', () => {
		getToolPermission.mockReturnValue('allow');
		getToolAllowedPaths.mockReturnValue(['/secret']);
		getPathModes.mockReturnValue([{ path: '/secret', mode: 'deny', recursive: true }]);
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('deny');
	});

	it('an allow rule lets a gated tool through without asking', () => {
		getToolPermission.mockReturnValue('ask');
		getPathModes.mockReturnValue([{ path: '/trusted', mode: 'allow', recursive: true }]);
		expect(resolveToolPermission('write', { path: '/trusted/a.txt' })).toBe('allow');
	});

	it('the deepest matching rule wins', () => {
		getPathModes.mockReturnValue([
			{ path: '/repo', mode: 'deny', recursive: true },
			{ path: '/repo/pub', mode: 'allow', recursive: true },
		]);
		expect(resolveToolPermission('write', { path: '/repo/pub/a.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/repo/a.txt' })).toBe('deny');
	});
});
