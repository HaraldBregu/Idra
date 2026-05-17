import type { TaskCreateRequest, TaskDefinition, TaskPermissionLevel } from '../core/task.types';

export function assertTaskPermissions(
	definition: TaskDefinition,
	request: TaskCreateRequest,
	grantedPermissions: Iterable<TaskPermissionLevel> = request.availablePermissions ?? []
): void {
	void definition;
	void request;
	void grantedPermissions;
}

export function isDestructiveOrExternalPermission(permission: TaskPermissionLevel): boolean {
	void permission;
	return false;
}
