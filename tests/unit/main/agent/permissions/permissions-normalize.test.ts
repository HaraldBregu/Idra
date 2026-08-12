import { normalizePermissionsSchema } from '../../../../../src/main/agent/permissions/normalize_permissions_schema';
import type { PermissionsSchema } from '../../../../../src/main/agent/permissions/permissions_types';

const fallback: PermissionsSchema = {
	read: { allow: ['/workspace/**'], deny: [] },
	write: { allow: ['/workspace/**'], deny: [] },
	exec: { allow: ['/workspace/**'], deny: [] },
};

describe('normalizePermissionsSchema', () => {
	it('trims and deduplicates every permission bucket', () => {
		expect(
			normalizePermissionsSchema(
				{
					read: { allow: [' /repo/** ', '/repo/**', 42], deny: [] },
					write: { allow: [], deny: [' /private/** '] },
					exec: { allow: ['/repo/**'], deny: [] },
				},
				fallback
			)
		).toEqual({
			read: { allow: ['/repo/**'], deny: [] },
			write: { allow: [], deny: ['/private/**'] },
			exec: { allow: ['/repo/**'], deny: [] },
		});
	});

	it('clones fallbacks for invalid and legacy schemas', () => {
		const normalized = normalizePermissionsSchema({ tools: {}, directories: [] }, fallback);
		normalized.read.allow.push('/other/**');
		expect(fallback.read.allow).toEqual(['/workspace/**']);
		expect(normalized.write).toEqual(fallback.write);
	});
});
