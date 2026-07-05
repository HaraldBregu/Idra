import { toolCommandName } from './policy_command';
import { isPathWithin, toolPathDir } from './policy_path';
import { getToolAllowedCommands, getToolAllowedPaths, getToolPermission } from './policy_store';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (command && getToolAllowedCommands(toolName).includes(command)) return 'allow';
		return 'ask';
	}
	const dir = toolPathDir(args);
	if (dir && getToolAllowedPaths(toolName).some((allowed) => isPathWithin(allowed, dir))) {
		return 'allow';
	}
	return 'ask';
}
