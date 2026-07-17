import os from 'node:os';
import path from 'node:path';

const getPermissions = jest.fn();

jest.mock('../../../../../src/main/agent/policy/policy_store', () => ({
	AGENT_DIRECTORY: '/appdata/agent',
	getPermissions,
}));

import { resolveToolPermission } from '../../../../../src/main/agent/policy/policy_resolve';
import type {
	PermissionsSchema,
	ToolPermission,
} from '../../../../../src/main/agent/policy/policy_types';

const entry = (
	defaultMode: ToolPermission['default'],
	overrides: Partial<ToolPermission> = {},
): ToolPermission => ({
	default: defaultMode,
	allow: [],
	deny: [],
	ask: [],
	...overrides,
});

const defaults = (): PermissionsSchema => ({
	read: entry('allow', { allow: ['Desktop'] }),
	write: entry('allow'),
	edit: entry('ask', { allow: ['Desktop/file.txt'] }),
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
		expect(resolveToolPermission('exec', { command: 'rm -rf build' })).toBe('ask');
		expect(
			resolveToolPermission('apply_patch', { input: '*** Update File: /outside/a.ts' }),
		).toBe('ask');
	});

	it('allows unconfigured targetless tools but asks for unconfigured path tools', () => {
		expect(resolveToolPermission('web_search', { query: 'Friday' })).toBe('allow');
		expect(resolveToolPermission('custom_file_tool', { path: '/outside/a.txt' })).toBe('ask');
	});

	it('applies a path rule only to its owning tool', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			read: entry('allow', { deny: ['/secret'] }),
		});
		expect(resolveToolPermission('read', { path: '/secret/a.txt' })).toBe('deny');
		expect(resolveToolPermission('write', { path: '/secret/a.txt' })).toBe('allow');
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
			}),
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
		expect(resolveToolPermission('exec', { command: 'git status' })).toBe('allow');
		expect(resolveToolPermission('exec', { command: 'git push origin main' })).toBe('deny');
		expect(resolveToolPermission('exec', { command: 'git-evil push' })).toBe('ask');
	});

	it('uses the most restrictive result across apply_patch targets', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			apply_patch: entry('allow', { deny: ['/secret'] }),
		});
		const input = [
			'*** Update File: /public/a.ts',
			'*** Update File: /secret/b.ts',
		].join('\n');
		expect(resolveToolPermission('apply_patch', { input })).toBe('deny');
	});

	it('does not bypass an explicit deny inside the agent directory', () => {
		getPermissions.mockReturnValue({
			...defaults(),
			edit: entry('ask', { deny: ['/appdata/agent'] }),
		});
		expect(resolveToolPermission('edit', { path: '/appdata/agent/a.txt' })).toBe('deny');
	});
});
