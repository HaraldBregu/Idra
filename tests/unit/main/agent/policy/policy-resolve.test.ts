const getToolPermission = jest.fn();
const getToolAllowedPaths = jest.fn();
const getToolAllowedCommands = jest.fn();
const getRestrictedDirectories = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	getToolPermission,
	getToolAllowedPaths,
	getToolAllowedCommands,
	getRestrictedDirectories,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';

beforeEach(() => {
	getToolPermission.mockReset();
	getToolAllowedPaths.mockReset().mockReturnValue([]);
	getToolAllowedCommands.mockReset().mockReturnValue([]);
	getRestrictedDirectories.mockReset().mockReturnValue([]);
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
