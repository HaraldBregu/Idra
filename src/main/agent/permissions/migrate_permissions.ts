import { normalizePermissionsSchema } from './normalize_permissions_schema';
import type { PermissionsSchema } from './permissions_types';
import { withWorkspacePermissions } from './with_workspace_permissions';

export function migratePermissions(
	value: unknown,
	version: number | undefined,
	currentVersion: number,
	fallback: PermissionsSchema,
	workspacePattern: string
): PermissionsSchema {
	const normalized = normalizePermissionsSchema(value, fallback);
	return withWorkspacePermissions(
		version === currentVersion ? normalized : { ...normalized, exec: fallback.exec },
		workspacePattern
	);
}
