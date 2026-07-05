import { isPathWithin, toolPathDir } from './permissions_path';
import { getToolAllowedPaths, getToolPermission } from './permissions_store';
import { isPermissionGatedTool, type PermissionMode } from './permissions_types';

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
