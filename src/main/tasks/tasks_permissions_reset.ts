import { DEFAULT_PERMISSIONS, type PermissionsSchema } from '../agent/permissions/permissions_types';
import { saveTaskPermissions } from './tasks_permissions_save';

export function resetTaskPermissions(): PermissionsSchema {
	return saveTaskPermissions(DEFAULT_PERMISSIONS);
}
