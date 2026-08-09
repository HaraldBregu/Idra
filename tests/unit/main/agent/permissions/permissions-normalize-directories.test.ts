import { normalizeDirectoryPermissions } from '../../../../../src/main/agent/policy/policy_normalize_directories';

describe('normalizeDirectoryPermissions', () => {
	it('keeps valid wildcard and tool-list entries', () => {
		expect(
			normalizeDirectoryPermissions({
				' /all ': { recoursive: true, tools: '*' },
				'/read': { recoursive: false, tools: [' read ', 'read', 'edit', 42] },
			})
		).toEqual({
			'/all': { recoursive: true, tools: '*' },
			'/read': { recoursive: false, tools: ['read', 'edit'] },
		});
	});

	it('drops invalid directory entries', () => {
		expect(
			normalizeDirectoryPermissions({
				'': { recoursive: true, tools: '*' },
				'/missing-recoursive': { tools: '*' },
				'/invalid-tools': { recoursive: true, tools: 'read' },
				'/valid': { recoursive: true, tools: [] },
			})
		).toEqual({ '/valid': { recoursive: true, tools: [] } });
	});
});
