import { migratePermissions } from '../../../../../src/main/agent/permissions/migrate_permissions';
import type { PermissionsSchema } from '../../../../../src/main/agent/permissions/permissions_types';

const workspace = '/workspace/**';
const fallback: PermissionsSchema = {
	read: { allow: [workspace], deny: [] },
	write: { allow: [workspace], deny: [] },
	exec: { allow: [workspace], deny: [] },
};

describe('migratePermissions', () => {
	it('preserves path rules but removes legacy command exec grants', () => {
		expect(
			migratePermissions(
				{
					read: { allow: ['/shared/**'], deny: [] },
					write: { allow: ['/output/**'], deny: [] },
					exec: { allow: ['*', 'npm test'], deny: ['sudo'] },
				},
				undefined,
				2,
				fallback,
				workspace
			)
		).toEqual({
			read: { allow: [workspace, '/shared/**'], deny: [] },
			write: { allow: [workspace, '/output/**'], deny: [] },
			exec: { allow: [workspace], deny: [] },
		});
	});

	it('retains versioned execute roots', () => {
		const current = migratePermissions(
			{ ...fallback, exec: { allow: ['/shared/**'], deny: ['/blocked/**'] } },
			2,
			2,
			fallback,
			workspace
		);
		expect(current.exec).toEqual({
			allow: [workspace, '/shared/**'],
			deny: ['/blocked/**'],
		});
	});
});
