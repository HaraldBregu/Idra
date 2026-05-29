jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			has: (key: string) => data.has(key),
		};
	});
});

import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';
import {
	AgentPermissionsStore,
	DEFAULT_AGENT_PERMISSIONS,
} from '../../../../src/main/agent';

const MockStore = Store as jest.MockedClass<typeof Store>;

function createMemoryStore() {
	const data = new Map<string, unknown>();
	return {
		data,
		get: jest.fn((key: string) => data.get(key)),
		set: jest.fn((key: string, value: unknown) => {
			data.set(key, value);
		}),
		has: jest.fn((key: string) => data.has(key)),
	};
}

describe('agent permissions settings.json', () => {
	beforeEach(() => {
		MockStore.mockClear();
		(app.getPath as jest.Mock).mockImplementation((name: string) => `/tmp/friday-test/${name}`);
	});

	it('creates electron-store settings.json in the agent app-data directory', () => {
		new AgentPermissionsStore();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'settings',
			cwd: path.join('/tmp/friday-test/appData', 'friday', 'agent'),
			accessPropertiesByDotNotation: false,
		});
	});

	it('seeds the default permissions structure when the file is empty', () => {
		const store = createMemoryStore();

		const service = new AgentPermissionsStore({ store });

		expect(store.set).toHaveBeenCalledWith('permissions', { allow: [], deny: [], ask: [] });
		expect(store.data.get('permissions')).toEqual(DEFAULT_AGENT_PERMISSIONS);
		expect(service.getPermissions()).toEqual({ allow: [], deny: [], ask: [] });
	});

	it('does not clobber existing permissions', () => {
		const store = createMemoryStore();
		store.data.set('permissions', { allow: ['read'], deny: ['exec'], ask: ['write'] });

		const service = new AgentPermissionsStore({ store });

		expect(store.set).not.toHaveBeenCalled();
		expect(service.getPermissions()).toEqual({ allow: ['read'], deny: ['exec'], ask: ['write'] });
	});
});
