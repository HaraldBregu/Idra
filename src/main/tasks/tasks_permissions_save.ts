import { normalizePermissionsSchema } from '../agent/permissions/permissions_normalize_schema';
import type { PermissionsSchema } from '../agent/permissions/permissions_types';
import { getTaskState, setTaskState } from './tasks_store';

export function saveTaskPermissions(value: unknown): PermissionsSchema {
	const permissions = normalizePermissionsSchema(value);
	setTaskState({ ...getTaskState(), permissions });
	return permissions;
}
