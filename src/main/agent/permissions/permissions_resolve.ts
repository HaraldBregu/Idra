import { getToolPermission } from './permissions_store';
import { isPermissionGatedTool, type PermissionMode } from './permissions_types';

export function resolveToolPermission(toolName: string): PermissionMode {
	if (!isPermissionGatedTool(toolName)) return 'allow';
	return getToolPermission(toolName);
}
