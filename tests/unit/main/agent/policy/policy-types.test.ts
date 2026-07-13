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
		expect(isPermissionGatedTool('read')).toBe(false);
		expect(isPermissionGatedTool('web_search')).toBe(false);
	});
});

describe('DEFAULT_PERMISSIONS', () => {
	it('defaults gated tools to ask and everything else to allow', () => {
		expect(DEFAULT_PERMISSIONS.defaultMode).toBe('allow');
		for (const tool of PERMISSION_GATED_TOOLS) {
			expect(DEFAULT_PERMISSIONS.tools[tool].mode).toBe('ask');
		}
	});
});
