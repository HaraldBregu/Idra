import {
	DEFAULT_PERMISSIONS,
	POLICY_TOOLS,
} from '../../../../../src/main/agent/policy/policy_types';

describe('DEFAULT_PERMISSIONS', () => {
	it('uses a complete top-level tool policy schema', () => {
		expect(Object.keys(DEFAULT_PERMISSIONS)).toEqual(POLICY_TOOLS);
		expect(DEFAULT_PERMISSIONS.read).toEqual({
			default: 'allow',
			allow: [],
			deny: [],
			ask: [],
		});
		expect(DEFAULT_PERMISSIONS.write).toEqual({
			default: 'allow',
			allow: [],
			deny: [],
			ask: [],
		});
		expect(DEFAULT_PERMISSIONS.edit).toEqual({
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('permissions');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultMode');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultPermissions');
	});
});
