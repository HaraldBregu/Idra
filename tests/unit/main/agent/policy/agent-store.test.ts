jest.mock('electron-store', () =>
	jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		let backing = structuredClone(options.defaults ?? {});
		return {
			get(key: string) {
				return (backing as Record<string, unknown>)[key];
			},
			set(key: string, value: unknown) {
				(backing as Record<string, unknown>)[key] = value;
			},
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
	getModelId,
	getPermissions,
	getPermissionMode,
	getProviderId,
	getSearchEngine,
	resetPermissions,
	setDirectoryPermissions,
	setModelId,
	setPermissionMode,
	setProviderId,
	setSearchEngine,
	setToolPermission,
} from '../../../../../src/main/agent/agent_store';

beforeEach(() => resetPermissions());

describe('agent store permissions', () => {
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

	it('preserves the other agent settings when permissions change', () => {
		setProviderId('provider');
		setModelId('model');
		setSearchEngine({ providerId: 'search', providerName: 'Search', enabled: true });

		setPermissionMode('bypass');

		expect(getProviderId()).toBe('provider');
		expect(getModelId()).toBe('model');
		expect(getSearchEngine()).toEqual({
			providerId: 'search',
			providerName: 'Search',
			enabled: true,
		});
	});
});
