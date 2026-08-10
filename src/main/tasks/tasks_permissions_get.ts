import { getPermissions } from '../agent/agent_store';
import { normalizePermissionsSchema } from '../agent/permissions/permissions_normalize_schema';
import type { PermissionsSchema } from '../agent/permissions/permissions_types';
import { getTaskState, setTaskState } from './tasks_store';

export function getTaskPermissions(): PermissionsSchema {
	const state = getTaskState();
	const permissions = normalizePermissionsSchema(state.permissions ?? getPermissions());
	if (!state.permissions) setTaskState({ ...state, permissions });
	return permissions;
}
