import type { PermissionMode } from './permissions_types';
import { getToolPermission } from './permissions_store';

export function resolveToolPermission(toolName: string): PermissionMode {
	return getToolPermission(toolName);
}
