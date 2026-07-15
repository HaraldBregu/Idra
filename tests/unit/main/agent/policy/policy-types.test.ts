import {
	isPermissionGatedTool,
	PERMISSION_GATED_TOOLS,
	DEFAULT_PERMISSIONS,
} from '../../../../../src/main/agent/policy/policy_types';

describe('isPermissionGatedTool', () => {
	it('recognizes gated tools', () => {
		for (const tool of PERMISSION_GATED_TOOLS) {
			expect(isPermissionGatedTool(tool)).toBe(true);
		}
	});
	it('rejects ungated tools', () => {
		expect(isPermissionGatedTool('edit')).toBe(false);
		expect(isPermissionGatedTool('web_search')).toBe(false);
	});
});

describe('DEFAULT_PERMISSIONS', () => {
	it('allows by default and starts with empty permission stores', () => {
		expect(DEFAULT_PERMISSIONS.defaultMode).toBe('allow');
		expect(DEFAULT_PERMISSIONS.defaultPermissions).toEqual([]);
		expect(DEFAULT_PERMISSIONS.permissions).toEqual({ allow: [], deny: [], ask: [] });
	});
});
