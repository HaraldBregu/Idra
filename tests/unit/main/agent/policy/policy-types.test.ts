import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/policy/policy_types';

describe('DEFAULT_PERMISSIONS', () => {
	it('asks by default and starts with empty permission stores', () => {
		expect(DEFAULT_PERMISSIONS.defaultMode).toBe('ask');
		expect(DEFAULT_PERMISSIONS.defaultPermissions).toEqual([]);
		expect(DEFAULT_PERMISSIONS.permissions).toEqual({ allow: [], deny: [], ask: [] });
	});
});
