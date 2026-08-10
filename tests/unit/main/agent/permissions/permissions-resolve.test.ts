import os from 'node:os';
import path from 'node:path';

const getPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/agent_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPermissions,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/permissions/resolve_tool_permission';
import { registry, type ProcessSession } from '../../../../../src/main/agent/tools/core/process';
import type {
	DirectoryPermission,
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

const defaults = (): PermissionsSchema => ({
	tools: {
		read_file: entry('allow'),
		write_file: entry('allow'),
		edit_file: entry('ask'),
		apply_patch: entry('ask'),
		exec_command: entry('ask'),
		process: entry('allow'),
	},
	directories: [],
});

const configured = (
	tools: Record<string, ToolPermission> = {},
	directories: DirectoryPermission[] = []
): PermissionsSchema => {
	const permissions = defaults();
	return { tools: { ...permissions.tools, ...tools }, directories };
};

const directory = (
	path: string,
	tools: DirectoryPermission['tools'] = '*',
	recoursive = true
): DirectoryPermission => ({ path, enabled: true, recoursive, tools });

beforeEach(() => {
	getPermissions.mockReset().mockImplementation(defaults);
});

describe('resolveToolPermission', () => {
	it('uses an injected run policy without consulting the global policy', () => {
		const permissions = configured({ read_file: entry('deny') });
		expect(
			resolveToolPermission(
				'read_file',
				{ path: '/outside/a.txt' },
				undefined,
				true,
				'ask',
				permissions
			)
		).toBe('deny');
		expect(getPermissions).not.toHaveBeenCalled();
	});

	it('uses the default owned by each tool', () => {
		expect(resolveToolPermission('read_file', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('write_file', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/outside/a.txt' })).toBe('ask');
		expect(
			resolveToolPermission('exec_command', {
				command: 'rm -rf build',
				workdir: '/outside',
			})
		).toBe('ask');
	});

	it('does not implicitly allow tools in the agent directory', () => {
		getPermissions.mockReturnValue(
			configured({
				read_file: entry('deny'),
				exec_command: entry('ask'),
			})
		);
		expect(resolveToolPermission('read_file', { path: '/appdata/agent/a.txt' })).toBe('deny');
		expect(
			resolveToolPermission('exec_command', {
				command: 'find /appdata/agent -type f -print',
				workdir: '/appdata/agent',
			})
		).toBe('ask');
	});

	it('allows a tool when its directory is explicitly authorized', () => {
		getPermissions.mockReturnValue(
			configured({ edit_file: entry('deny') }, [directory('/shared')])
		);
		expect(resolveToolPermission('edit_file', { path: '/shared/nested/file.txt' })).toBe('allow');
	});

	it('checks directory authorization before explicit tool rules', () => {
		getPermissions.mockReturnValue(
			configured(
				{
					edit_file: entry('ask', {
						ask: ['/shared/review'],
						deny: ['/shared/blocked'],
					}),
				},
				[directory('/shared', ['edit_file'])]
			)
		);
		expect(resolveToolPermission('edit_file', { path: '/shared/review/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/shared/blocked/file.txt' })).toBe(
			'allow'
		);
	});

	it('falls through to the tool when a directory omits it', () => {
		getPermissions.mockReturnValue(
			configured({ write_file: entry('ask') }, [directory('/shared', ['read_file'])])
		);
		expect(resolveToolPermission('read_file', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('write_file', { path: '/shared/file.txt' })).toBe('ask');
	});

	it('limits non-recursive entries to the current directory', () => {
		getPermissions.mockReturnValue(
			configured({ edit_file: entry('ask') }, [directory('/shared', '*', false)])
		);
		expect(resolveToolPermission('edit_file', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/shared/nested/file.txt' })).toBe('ask');
	});

	it('uses the most-specific matching directory entry', () => {
		getPermissions.mockReturnValue(
			configured({ edit_file: entry('ask') }, [
				directory('/shared'),
				directory('/shared/read-only', ['read_file']),
			])
		);
		expect(resolveToolPermission('edit_file', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit_file', { path: '/shared/read-only/file.txt' })).toBe('ask');
	});

	it('applies directory permissions to exec by working directory', () => {
		getPermissions.mockReturnValue(
			configured({ exec_command: entry('ask') }, [directory('/shared', ['exec_command'])])
		);
		expect(
			resolveToolPermission('exec_command', { command: 'npm test', workdir: '/shared/app' })
		).toBe('allow');
		expect(
			resolveToolPermission('exec_command', { command: 'npm test', workdir: '/outside' })
		).toBe('ask');
	});

	it('resolves process calls through their originating working directory', () => {
		const sessions = [
			{ id: 'process-directory', workdir: '/shared/app' },
			{ id: 'process-tool', workdir: '/outside/app' },
		] as ProcessSession[];
		for (const session of sessions) registry.register(session);
		try {
			getPermissions.mockReturnValue(
				configured({ process: entry('deny') }, [directory('/shared', ['process'])])
			);
			expect(
				resolveToolPermission('process', { action: 'poll', sessionId: 'process-directory' })
			).toBe('allow');
			expect(
				resolveToolPermission('process', { action: 'poll', sessionId: 'process-tool' })
			).toBe('deny');
		} finally {
			for (const session of sessions) registry.remove(session.id);
		}
	});

	it('falls through when every patch target is not directory-authorized', () => {
		getPermissions.mockReturnValue(
			configured({ apply_patch: entry('ask') }, [
				directory('/shared'),
				directory('/shared/read-only', ['read_file']),
			])
		);
		const input = ['*** Update File: /shared/a.ts', '*** Update File: /shared/read-only/b.ts'].join(
			'\n'
		);
		expect(resolveToolPermission('apply_patch', { input })).toBe('ask');
	});

	it('uses the most-specific tool rule when no directory allows', () => {
		getPermissions.mockReturnValue(
			configured({
				read_file: entry('ask', { deny: ['/repo'], allow: ['/repo/public'] }),
			})
		);
		expect(resolveToolPermission('read_file', { path: '/repo/private.txt' })).toBe('deny');
		expect(resolveToolPermission('read_file', { path: '/repo/public/a.txt' })).toBe('allow');
	});

	it('resolves relative tool paths from the user home', () => {
		getPermissions.mockReturnValue(
			configured({ read_file: entry('deny', { allow: ['Desktop'] }) })
		);
		expect(
			resolveToolPermission('read_file', {
				path: path.join(os.homedir(), 'Desktop', 'example.txt'),
			})
		).toBe('allow');
	});

	it('matches exact and trailing-prefix exec command rules', () => {
		getPermissions.mockReturnValue(
			configured({
				exec_command: entry('ask', {
					allow: ['git status'],
					deny: ['git push:*'],
				}),
			})
		);
		expect(
			resolveToolPermission('exec_command', { command: 'git status', workdir: '/outside' })
		).toBe('allow');
		expect(
			resolveToolPermission('exec_command', {
				command: 'git push origin main',
				workdir: '/outside',
			})
		).toBe('deny');
		expect(
			resolveToolPermission('exec_command', {
				command: 'git-evil push',
				workdir: '/outside',
			})
		).toBe('ask');
	});

	it('uses the fallback for an unconfigured tool', () => {
		expect(resolveToolPermission('mcp__safe__lookup', {}, undefined, true, 'allow')).toBe('allow');
	});
});
