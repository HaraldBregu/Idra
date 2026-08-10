import { normalizePermissionsSchema } from '../agent/permissions/normalize_permissions_schema';
import {
	ALL_ALLOWED_PERMISSIONS,
	type PermissionsSchema,
} from '../agent/permissions/permissions_types';
import { getTaskState, setTaskState } from './tasks_store';

export function getTaskPermissions(): PermissionsSchema {
	const state = getTaskState();
	const permissions = normalizePermissionsSchema(state.permissions ?? ALL_ALLOWED_PERMISSIONS);
	if (!state.permissions) setTaskState({ ...state, permissions });
	return permissions;
}
