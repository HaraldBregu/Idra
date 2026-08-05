import os from 'node:os';
import path from 'node:path';

const getPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/agent_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPermissions,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';
import { registry, type ProcessSession } from '../../../../../src/main/agent/tools/run_process';
import type {
	PermissionsSchema,
	ToolPermission,
} from '../../../../../src/main/agent/policy/policy_types';

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
	dir: {},
	mode: 'ask',
	read: entry('allow'),
	write: entry('allow'),
	edit: entry('ask'),
	apply_patch: entry('ask'),
	exec: entry('ask'),
});

beforeEach(() => {
	getPermissions.mockReset().mockImplementation(defaults);
});

describe('resolveToolPermission', () => {
	it('uses the default owned by each tool', () => {
		expect(resolveToolPermission('read', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/outside/a.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/outside/a.txt' })).toBe('ask');
		expect(resolveToolPermission('exec', { command: 'rm -rf build', workdir: '/outside' })).toBe(
			'ask'
		);
		expect(resolveToolPermission('apply_patch', { input: '*** Update File: /outside/a.ts' })).toBe(
			'ask'
		);
	});

	it('allows path-aware and agent-owned tools recursively inside the agent directory first', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('deny'),
			edit: entry('deny'),
			apply_patch: entry('deny'),
			exec: entry('deny'),
			mcp__files__inspect: entry('deny'),
			memory_save: entry('deny'),
			create_schedule: entry('deny'),
		});
		expect(resolveToolPermission('read', { path: '/appdata/agent/a.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/appdata/agent/nested/a.txt' })).toBe('allow');
		expect(
			resolveToolPermission('apply_patch', {
				input: '*** Update File: /appdata/agent/a.ts',
			})
		).toBe('allow');
		expect(
			resolveToolPermission('exec', { command: 'npm test', workdir: '/appdata/agent/app' })
		).toBe('allow');
		expect(resolveToolPermission('mcp__files__inspect', { path: '/appdata/agent/a.txt' })).toBe(
			'allow'
		);
		expect(resolveToolPermission('memory_save', { fact: 'remember me' })).toBe('allow');
		expect(resolveToolPermission('create_schedule', { request: {} })).toBe('allow');
	});

	it('requires every target to pass the system layer', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			apply_patch: entry('deny'),
		});
		const input = ['*** Update File: /appdata/agent/a.ts', '*** Update File: /outside/b.ts'].join(
			'\n'
		);
		expect(resolveToolPermission('apply_patch', { input })).toBe('deny');
	});

	it('sends targetless tools directly to their tool policy', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			web_search: entry('deny'),
		});
		expect(resolveToolPermission('web_search', { query: 'Friday' })).toBe('deny');
	});

	it('asks for unconfigured tools whether or not they expose a path', () => {
		expect(resolveToolPermission('mcp__records__delete', { id: '1' })).toBe('ask');
		expect(resolveToolPermission('custom_file_tool', { path: '/outside/a.txt' })).toBe('ask');
	});

	it('uses a tool-provided fallback only when no stored policy exists', () => {
		expect(resolveToolPermission('mcp__safe__lookup', {}, undefined, true, 'allow')).toBe('allow');
		getPermissions.mockReturnValue({
			...defaults(),
			mcp__safe__lookup: entry('deny'),
		});
		expect(resolveToolPermission('mcp__safe__lookup', {}, undefined, true, 'allow')).toBe('deny');
	});

	it('applies a path rule only to its owning tool', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('allow', { deny: ['/secret'] }),
		});
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('allow');
	});

	it('reuses a stored read-folder approval for another file in that folder', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('ask', { allow: ['/approved'] }),
		});
		expect(resolveToolPermission('read', { path: '/approved/next.txt' })).toBe('allow');
		expect(resolveToolPermission('read', { path: '/other/next.txt' })).toBe('ask');
	});

	it('matches an exact read-file rule without affecting its sibling', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('allow', { deny: ['/secret/a.txt'] }),
		});
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/secret/b.txt' })).toBe('allow');
	});

	it('allows every tool in a recursive wildcard directory', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: true, tools: '*' } },
		});
		expect(resolveToolPermission('edit', { path: '/shared/nested/file.txt' })).toBe('allow');
	});

	it('falls through to the tool policy when a matching directory omits the tool', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: true, tools: ['read'] } },
			write: entry('ask'),
		});
		expect(resolveToolPermission('read', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('write', { path: '/shared/file.txt' })).toBe('ask');
	});

	it('limits non-recursive entries to direct files', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: false, tools: '*' } },
		});
		expect(resolveToolPermission('edit', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/shared/nested/file.txt' })).toBe('ask');
	});

	it('limits non-recursive read entries to files directly in that folder', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('ask'),
			dir: { '/shared': { recoursive: false, tools: ['read'] } },
		});
		expect(resolveToolPermission('read', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('read', { path: '/shared/nested/file.txt' })).toBe('ask');
	});

	it('uses the most-specific matching directory entry', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: {
				'/shared': { recoursive: true, tools: '*' },
				'/shared/read-only': { recoursive: true, tools: ['read'] },
			},
		});
		expect(resolveToolPermission('edit', { path: '/shared/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/shared/read-only/file.txt' })).toBe('ask');
	});

	it('allows a directory match before consulting explicit tool rules', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: true, tools: ['edit'] } },
			edit: entry('ask', {
				ask: ['/shared/review'],
				deny: ['/shared/blocked'],
			}),
		});
		expect(resolveToolPermission('edit', { path: '/shared/allowed/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/shared/review/file.txt' })).toBe('allow');
		expect(resolveToolPermission('edit', { path: '/shared/blocked/file.txt' })).toBe('allow');
	});

	it('applies directory permissions to exec by working directory', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: true, tools: ['exec'] } },
		});
		expect(resolveToolPermission('exec', { command: 'npm test', workdir: '/shared/app' })).toBe(
			'allow'
		);
		expect(resolveToolPermission('exec', { command: 'npm test', workdir: '/outside' })).toBe('ask');
	});

	it('resolves process calls through system, directory, then tool policy', () => {
		const sessions = [
			{ id: 'process-system', workdir: '/appdata/agent/app' },
			{ id: 'process-directory', workdir: '/shared/app' },
			{ id: 'process-tool', workdir: '/outside/app' },
		] as ProcessSession[];
		for (const session of sessions) registry.register(session);
		try {
			getPermissions.mockReturnValue({
				...defaults(),
				dir: { '/shared': { recoursive: true, tools: ['process'] } },
				process: entry('deny'),
			});
			expect(
				resolveToolPermission('process', { action: 'poll', sessionId: 'process-system' })
			).toBe('allow');
			expect(
				resolveToolPermission('process', { action: 'poll', sessionId: 'process-directory' })
			).toBe('allow');
			expect(resolveToolPermission('process', { action: 'poll', sessionId: 'process-tool' })).toBe(
				'deny'
			);
		} finally {
			for (const session of sessions) registry.remove(session.id);
		}
	});

	it('uses exec policy when a matching working directory omits it', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: { '/shared': { recoursive: true, tools: ['read'] } },
		});
		expect(resolveToolPermission('exec', { command: 'npm test', workdir: '/shared/app' })).toBe(
			'ask'
		);
	});

	it('falls through when every patch target does not pass the directory layer', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			dir: {
				'/shared': { recoursive: true, tools: '*' },
				'/shared/read-only': { recoursive: true, tools: ['read'] },
			},
		});
		const input = ['*** Update File: /shared/a.ts', '*** Update File: /shared/read-only/b.ts'].join(
			'\n'
		);
		expect(resolveToolPermission('apply_patch', { input })).toBe('ask');
	});

	it('uses the most specific matching path', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('ask', { deny: ['/repo'], allow: ['/repo/public'] }),
		});
		expect(resolveToolPermission('read', { path: '/repo/private.txt' })).toBe('deny');
		expect(resolveToolPermission('read', { path: '/repo/public/a.txt' })).toBe('allow');
	});

	it('uses deny over ask over allow when equally specific rules overlap', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('allow', {
				allow: ['/watched'],
				ask: ['/watched'],
				deny: ['/watched'],
			}),
		});
		expect(resolveToolPermission('read', { path: '/watched/a.txt' })).toBe('deny');
	});

	it('resolves relative policy paths from the user home', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('deny', { allow: ['Desktop'] }),
		});
		expect(
			resolveToolPermission('read', {
				path: path.join(os.homedir(), 'Desktop', 'example.txt'),
			})
		).toBe('allow');
	});

	it('matches exact and trailing-prefix exec command rules', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			exec: entry('ask', {
				allow: ['git status'],
				deny: ['git push:*'],
			}),
		});
		expect(resolveToolPermission('exec', { command: 'git status', workdir: '/outside' })).toBe(
			'allow'
		);
		expect(
			resolveToolPermission('exec', { command: 'git push origin main', workdir: '/outside' })
		).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'git-evil push', workdir: '/outside' })).toBe(
			'ask'
		);
	});

	it('uses the most restrictive result across apply_patch targets', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			apply_patch: entry('allow', { deny: ['/secret'] }),
		});
		const input = ['*** Update File: /public/a.ts', '*** Update File: /secret/b.ts'].join('\n');
		expect(resolveToolPermission('apply_patch', { input })).toBe('deny');
	});

	it('allows the system directory before consulting an explicit deny', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			edit: entry('ask', { deny: ['/appdata/agent'] }),
		});
		expect(resolveToolPermission('edit', { path: '/appdata/agent/a.txt' })).toBe('allow');
	});
});
