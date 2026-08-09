import {
	DEFAULT_PERMISSIONS,
	PERMISSION_TOOLS,
} from '../../../../../src/main/agent/permissions/permissions_types';

describe('DEFAULT_PERMISSIONS', () => {
	it('uses a complete top-level tool policy schema', () => {
		expect(Object.keys(DEFAULT_PERMISSIONS).sort()).toEqual(
			['dir', 'mode', ...PERMISSION_TOOLS].sort()
		);
		expect(DEFAULT_PERMISSIONS.dir).toEqual({});
		expect(DEFAULT_PERMISSIONS.mode).toBe('ask');
		expect(DEFAULT_PERMISSIONS.read).toEqual({
			default: 'ask',
			allow: [],
			deny: [],
			ask: [],
		});
		expect(DEFAULT_PERMISSIONS.write).toEqual({
			default: 'ask',
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
		for (const toolName of ['list_extensions', 'open_extensions']) {
			expect(DEFAULT_PERMISSIONS[toolName]).toEqual({
				default: 'allow',
				allow: [],
				deny: [],
				ask: [],
			});
		}
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('permissions');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultMode');
		expect(DEFAULT_PERMISSIONS).not.toHaveProperty('defaultPermissions');
		for (const toolName of PERMISSION_TOOLS) {
			const permission = DEFAULT_PERMISSIONS[toolName];
			expect(permission).toMatchObject({ allow: [], deny: [], ask: [] });
		}
	});
});
