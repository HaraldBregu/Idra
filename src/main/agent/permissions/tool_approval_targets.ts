import path from 'node:path';
import { directoryPermissionTargets } from './directory_permission_targets';
import { toolPermissionTargets } from './tool_permission_targets';

export function toolApprovalTargets(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): string[] {
	if (toolName === 'exec_command' || toolName === 'process') {
		return directoryPermissionTargets(toolName, args, baseDir);
	}
	const targets = toolPermissionTargets(toolName, args, baseDir);
	return targets.length > 0
		? targets.map((target) => path.dirname(target))
		: directoryPermissionTargets(toolName, args, baseDir);
}
