jest.mock('electron-store', () =>
	jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		let backing = structuredClone(options.defaults ?? {});
		return {
			get store() {
				return backing;
			},
			set store(value: unknown) {
				backing = value;
			},
		};
	})
);

import {
	getPermissions,
	getPermissionMode,
	resetPermissions,
	setDirectoryPermissions,
	setPermissionMode,
	setToolPermission,
} from '../../../../../src/main/agent/policy/policy_store';

beforeEach(() => resetPermissions());

describe('policy store directories', () => {
	it('persists the agent permission mode', () => {
		expect(getPermissionMode()).toBe('ask');
		setPermissionMode('bypass');
		expect(getPermissions().mode).toBe('bypass');
		expect(resetPermissions().mode).toBe('ask');
	});

	it('preserves normalized directory entries when a tool changes', () => {
		setDirectoryPermissions({
			' /shared ': { recoursive: true, tools: [' read ', 'read'] },
		});
		const policy = setToolPermission('read', {
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});

		expect(policy.dir).toEqual({
			'/shared': { recoursive: true, tools: ['read'] },
		});
		expect(policy.read).toEqual({ default: 'ask', allow: [], deny: [], ask: [] });
	});

	it('reserves dir from tool updates', () => {
		expect(() =>
			setToolPermission('dir', { default: 'allow', allow: [], deny: [], ask: [] })
		).toThrow("'dir' is reserved");
	});

	it('resets directory permissions to an empty map', () => {
		setDirectoryPermissions({ '/shared': { recoursive: true, tools: '*' } });
		expect(getPermissions().dir).not.toEqual({});
		expect(resetPermissions().dir).toEqual({});
	});
});
