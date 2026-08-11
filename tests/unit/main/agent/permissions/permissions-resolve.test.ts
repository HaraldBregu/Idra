const getPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/agent_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPermissions,
}));

import { createRunContext } from '../../../../../src/main/agent/context';
import { resolveToolPermission } from '../../../../../src/main/agent/permissions/resolve_tool_permission';
import type { PermissionsSchema } from '../../../../../src/main/agent/permissions/permissions_types';

const defaults: PermissionsSchema = {
	read: { allow: ['/outside/**'], deny: [] },
	write: { allow: [], deny: [] },
	exec: { allow: [], deny: [] },
};

beforeEach(() => {
	getPermissions.mockReset().mockReturnValue(defaults);
});

describe('resolveToolPermission', () => {
	it('uses an injected policy without consulting the global policy', () => {
		const injected: PermissionsSchema = {
			...defaults,
			read: { allow: [], deny: ['/outside/**'] },
		};

		expect(
			resolveToolPermission(
				'read_file',
				{ path: '/outside/a.txt' },
				undefined,
				true,
				'ask',
				injected
			)
		).toBe('deny');
		expect(getPermissions).not.toHaveBeenCalled();
	});

	it('uses configured rules and the caller fallback for unknown tools', () => {
		expect(resolveToolPermission('read_file', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/outside/a.txt' })).toBe('ask');
		expect(resolveToolPermission('mcp__safe__lookup', {}, undefined, true, 'allow')).toBe('allow');
		expect(resolveToolPermission('mcp__records__delete')).toBe('allow');
	});

	it('keeps deny precedence over allow and contextual reuse', () => {
		getPermissions.mockReturnValue({
			...defaults,
			read: { allow: ['/repo/**'], deny: ['/repo/private/**'] },
		});
		const fileAccess = createRunContext().fileAccess;
		fileAccess.readDirectories.add('/repo/private');

		expect(resolveToolPermission('read_file', { path: '/repo/public/a.txt' })).toBe('allow');
		expect(
			resolveToolPermission('read_file', { path: '/repo/private/a.txt' }, fileAccess)
		).toBe('deny');
	});

	it('matches exact and command-prefix rules', () => {
		getPermissions.mockReturnValue({
			...defaults,
			exec: { allow: ['git status'], deny: ['git push'] },
		});

		expect(resolveToolPermission('exec_command', { command: 'git status' })).toBe('allow');
		expect(resolveToolPermission('exec_command', { command: 'git push origin main' })).toBe(
			'deny'
		);
		expect(resolveToolPermission('exec_command', { command: 'git-evil push' })).toBe('ask');
	});
});
