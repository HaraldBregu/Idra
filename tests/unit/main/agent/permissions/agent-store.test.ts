jest.mock('electron-store', () =>
	jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		const backing = structuredClone(options.defaults ?? {});
		return {
			get: (key: string) => (backing as Record<string, unknown>)[key],
			set: (key: string, value: unknown) => {
				(backing as Record<string, unknown>)[key] = value;
			},
		};
	})
);

import {
	AGENT_DIRECTORY,
	addPermissionRule,
	getMediaModel,
	getModelId,
	getPermissions,
	getProviderId,
	resetPermissions,
	setMediaModel,
	setModelId,
	setPermissions,
	setProviderId,
} from '../../../../../src/main/agent/agent_store';

const workspaceRule = `${AGENT_DIRECTORY.replaceAll('\\', '/')}/**`;

beforeEach(() => resetPermissions());

describe('agent store permissions', () => {
	it('trusts the workspace recursively for every filesystem capability', () => {
		expect(resetPermissions()).toEqual({
			read: { allow: [workspaceRule], deny: [] },
			write: { allow: [workspaceRule], deny: [] },
			exec: { allow: [workspaceRule], deny: [] },
		});
	});

	it('normalizes rules and never removes the workspace grant', () => {
		const saved = setPermissions({
			read: { allow: [' /repo/** ', '/repo/**'], deny: [] },
			write: { allow: [], deny: ['/blocked/**'] },
			exec: { allow: [], deny: [] },
		});
		expect(saved.read.allow).toEqual([workspaceRule, '/repo/**']);
		expect(saved.write.allow).toEqual([workspaceRule]);
		expect(saved.exec.allow).toEqual([workspaceRule]);
	});

	it('adds a rule without changing other buckets', () => {
		addPermissionRule('exec', 'allow', '/repo/**');
		expect(getPermissions().exec.allow).toEqual([workspaceRule, '/repo/**']);
		expect(getPermissions().read.allow).toEqual([workspaceRule]);
	});

	it('preserves unrelated agent settings', () => {
		setProviderId('provider');
		setModelId('model');
		setMediaModel('image', { providerId: 'google', modelId: 'image', options: {} });
		setPermissions({
			read: { allow: [], deny: [] },
			write: { allow: [], deny: [] },
			exec: { allow: [], deny: [] },
		});
		expect(getProviderId()).toBe('provider');
		expect(getModelId()).toBe('model');
		expect(getMediaModel('image')).toMatchObject({ providerId: 'google', modelId: 'image' });
	});
});
