import { normalizeDirectoryPermissions } from '../../../../../src/main/agent/permissions/normalize_directory_permissions';

describe('normalizeDirectoryPermissions', () => {
	it('keeps valid wildcard and tool-list entries', () => {
		expect(
			normalizeDirectoryPermissions([
				{ path: ' /all ', enabled: true, recoursive: true, tools: '*' },
				{
					path: '/read',
					enabled: false,
					recoursive: false,
					tools: [' read ', 'read', 'edit', 42],
				},
			])
		).toEqual([
			{ path: '/all', enabled: true, recoursive: true, tools: '*' },
			{ path: '/read', enabled: false, recoursive: false, tools: ['read', 'edit'] },
		]);
	});

	it('drops invalid directory entries', () => {
		expect(
			normalizeDirectoryPermissions([
				{ path: '', enabled: true, recoursive: true, tools: '*' },
				{ path: '/missing-enabled', recoursive: true, tools: '*' },
				{ path: '/missing-recoursive', enabled: true, tools: '*' },
				{ path: '/invalid-tools', enabled: true, recoursive: true, tools: 'read' },
				{ path: '/valid', enabled: true, recoursive: true, tools: [] },
			])
		).toEqual([{ path: '/valid', enabled: true, recoursive: true, tools: [] }]);
	});
});
