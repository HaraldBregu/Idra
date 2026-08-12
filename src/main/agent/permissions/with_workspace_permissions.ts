import type { PermissionsSchema } from './permissions_types';

export function withWorkspacePermissions(
	permissions: PermissionsSchema,
	workspacePattern: string
): PermissionsSchema {
	return {
		read: {
			...permissions.read,
			allow: [...new Set([workspacePattern, ...permissions.read.allow])],
		},
		write: {
			...permissions.write,
			allow: [...new Set([workspacePattern, ...permissions.write.allow])],
		},
		exec: {
			...permissions.exec,
			allow: [...new Set([workspacePattern, ...permissions.exec.allow])],
		},
	};
}
