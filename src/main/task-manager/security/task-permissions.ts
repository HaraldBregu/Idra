import type { TaskCreateRequest, TaskDefinition, TaskPermissionLevel } from '../core/task.types';
import { TaskPermissionError } from '../core/task.errors';

export function assertTaskPermissions(
	definition: TaskDefinition,
	request: TaskCreateRequest,
	grantedPermissions: Iterable<TaskPermissionLevel> = request.availablePermissions ?? []
): void {
	const granted = new Set(grantedPermissions);
	if (granted.has('admin')) return;

	const missing = definition.requiredPermissions.filter((permission) => !granted.has(permission));
	if (missing.length === 0) return;

	throw new TaskPermissionError(`Missing task permission: ${missing.join(', ')}`, {
		taskType: definition.taskType,
		missing,
		source: request.source,
	});
}

export function isDestructiveOrExternalPermission(permission: TaskPermissionLevel): boolean {
	return ['deleteData', 'writeExternal', 'runCode', 'admin'].includes(permission);
}
