import { isToolPermission } from './is_tool_permission';
import { normalizeToolPermission } from './normalize_tool_permission';
import { normalizeDirectoryPermissions } from './normalize_directory_permissions';
import {
	DEFAULT_TOOL_PERMISSIONS,
	type PermissionsSchema,
	type ToolPermission,
} from './permissions_types';

export function normalizePermissionsSchema(value: unknown): PermissionsSchema {
	const stored =
		value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	const unknownPermission: ToolPermission = {
		default: 'ask',
		allow: [],
		deny: [],
		ask: [],
	};
	const result: PermissionsSchema = {
		dir: normalizeDirectoryPermissions(stored.dir),
		mode: stored.mode === 'bypass' ? 'bypass' : 'ask',
	};
	for (const [toolName, fallback] of Object.entries(DEFAULT_TOOL_PERMISSIONS)) {
		result[toolName] = normalizeToolPermission(stored[toolName], fallback);
	}
	for (const [toolName, entry] of Object.entries(stored)) {
		if (toolName === 'dir' || toolName === 'mode' || result[toolName] || !isToolPermission(entry)) {
			continue;
		}
		result[toolName] = normalizeToolPermission(entry, unknownPermission);
	}
	return result;
}
