import {
	DEFAULT_PERMISSIONS,
	DEFAULT_TOOL_PERMISSIONS,
} from '../../../../../src/main/agent/permissions/permissions_types';

const ASK_BY_DEFAULT = [
	'edit_file',
	'apply_patch',
	'exec_command',
] as const;

describe('DEFAULT_PERMISSIONS', () => {
	it('uses the current tools and directories schema', () => {
		expect(DEFAULT_PERMISSIONS).toEqual({
			tools: DEFAULT_TOOL_PERMISSIONS,
			directories: [],
		});
	});

	it('asks only for destructive core capabilities by default', () => {
		const asking = Object.entries(DEFAULT_TOOL_PERMISSIONS)
			.filter(([, permission]) => permission.default === 'ask')
			.map(([toolName]) => toolName)
			.sort();
		expect(asking).toEqual([...ASK_BY_DEFAULT].sort());
	});
});
