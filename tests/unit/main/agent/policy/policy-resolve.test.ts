const getToolPermission = jest.fn();
const getToolAllowedPaths = jest.fn();
const getToolAllowedCommands = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	getToolPermission,
	getToolAllowedPaths,
	getToolAllowedCommands,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';

beforeEach(() => {
	getToolPermission.mockReset();
	getToolAllowedPaths.mockReset().mockReturnValue([]);
	getToolAllowedCommands.mockReset().mockReturnValue([]);
	isWithinSandbox.mockReset().mockReturnValue(false);
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

	it('allows an "ask" tool whose targets are all inside the sandbox', () => {
		getToolPermission.mockReturnValue('ask');
		isWithinSandbox.mockReturnValue(true);
		expect(resolveToolPermission('write', { path: '/sandbox/a.txt' })).toBe('allow');
	});

	it('asks when a target lies outside the sandbox and is not allowlisted', () => {
		getToolPermission.mockReturnValue('ask');
		isWithinSandbox.mockReturnValue(false);
		getToolAllowedPaths.mockReturnValue([]);
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('ask');
	});

	it('allows an outside target that is within an allowlisted path', () => {
		getToolPermission.mockReturnValue('ask');
		isWithinSandbox.mockReturnValue(false);
		getToolAllowedPaths.mockReturnValue(['/outside']);
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('allow');
	});

	it('asks for exec when the command is not allowlisted, even if the dir is', () => {
		getToolPermission.mockReturnValue('ask');
		isWithinSandbox.mockReturnValue(false);
		getToolAllowedPaths.mockReturnValue(['/work']);
		getToolAllowedCommands.mockReturnValue([]);
		expect(resolveToolPermission('exec', { command: 'rm -rf /', workdir: '/work' })).toBe('ask');
	});

	it('allows exec when both command and dir are allowlisted', () => {
		getToolPermission.mockReturnValue('ask');
		isWithinSandbox.mockReturnValue(false);
		getToolAllowedPaths.mockReturnValue(['/work']);
		getToolAllowedCommands.mockReturnValue(['git']);
		expect(resolveToolPermission('exec', { command: 'git status', workdir: '/work' })).toBe('allow');
	});
});
