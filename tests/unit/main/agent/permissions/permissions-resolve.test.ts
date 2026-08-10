const getPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/agent_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPermissions,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/permissions/resolve_tool_permission';
import type {
	PermissionsSchema,
	ToolPermission,
} from '../../../../../src/main/agent/permissions/permissions_types';

const entry = (
	defaultMode: ToolPermission['default'],
	overrides: Partial<ToolPermission> = {}
): ToolPermission => ({
	default: defaultMode,
	allow: [],
	deny: [],
	ask: [],
	...overrides,
});

const defaults: PermissionsSchema = {
	tools: {
		read_file: entry('allow'),
		write_file: entry('allow'),
		edit_file: entry('ask'),
		apply_patch: entry('ask'),
		exec_command: entry('ask'),
	},
	directories: [],
};

beforeEach(() => {
	getPermissions.mockReset().mockReturnValue(defaults);
});

describe('resolveToolPermission', () => {
	it('uses an injected policy without consulting the global policy', () => {
		const injected: PermissionsSchema = {
			...defaults,
			tools: { ...defaults.tools, read_file: entry('deny') },
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

	it('uses configured defaults and the caller fallback for unknown tools', () => {
		expect(resolveToolPermission('read_file', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/outside/a.txt' })).toBe('ask');
		expect(resolveToolPermission('mcp__safe__lookup', {}, undefined, true, 'allow')).toBe('allow');
		expect(resolveToolPermission('mcp__records__delete')).toBe('ask');
	});

	it('uses the most specific path rule and restrictive tie precedence', () => {
		getPermissions.mockReturnValue({
			...defaults,
			tools: {
				...defaults.tools,
				read_file: entry('ask', {
					allow: ['/repo/public', '/watched'],
					ask: ['/watched'],
					deny: ['/repo', '/watched'],
				}),
			},
		});

		expect(resolveToolPermission('read_file', { path: '/repo/public/a.txt' })).toBe('allow');
		expect(resolveToolPermission('read_file', { path: '/repo/private.txt' })).toBe('deny');
		expect(resolveToolPermission('read_file', { path: '/watched/a.txt' })).toBe('deny');
	});

	it('matches exact and trailing-prefix command rules', () => {
		getPermissions.mockReturnValue({
			...defaults,
			tools: {
				...defaults.tools,
				exec_command: entry('ask', {
					allow: ['git status'],
					deny: ['git push:*'],
				}),
			},
		});

		expect(resolveToolPermission('exec_command', { command: 'git status' })).toBe('allow');
		expect(resolveToolPermission('exec_command', { command: 'git push origin main' })).toBe(
			'deny'
		);
		expect(resolveToolPermission('exec_command', { command: 'git-evil push' })).toBe('ask');
	});

	it('allows tools covered by an enabled directory permission', () => {
		getPermissions.mockReturnValue({
			...defaults,
			directories: [
				{
					path: '/shared',
					enabled: true,
					recoursive: true,
					tools: ['edit_file'],
				},
			],
		});

		expect(resolveToolPermission('edit_file', { path: '/shared/nested/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/outside/file.txt' })).toBe('ask');
	});

	it('ignores disabled directory permissions', () => {
		getPermissions.mockReturnValue({
			...defaults,
			directories: [
				{
					path: '/shared',
					enabled: false,
					recoursive: true,
					tools: '*',
				},
			],
		});

		expect(resolveToolPermission('edit_file', { path: '/shared/file.txt' })).toBe('ask');
	});
});
