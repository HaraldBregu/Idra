import { isPathWithin, toolPathDir } from './policy_path';
import { getToolAllowedPaths, getToolPermission } from './policy_store';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	const dir = toolPathDir(args);
	if (dir && getToolAllowedPaths(toolName).some((allowed) => isPathWithin(allowed, dir))) {
		return 'allow';
	}
	return 'ask';
}
