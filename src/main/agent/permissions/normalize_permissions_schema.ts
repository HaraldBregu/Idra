import { isToolPermission } from './is_tool_permission';
import { normalizeToolPermission } from './normalize_tool_permission';
import { normalizeDirectoryPermissions } from './normalize_directory_permissions';
import {
	DEFAULT_TOOL_PERMISSIONS,
	type PermissionsSchema,
	type ToolPermission,
} from './permissions_types';
import { currentToolName } from '../tools/aliases';

export function normalizePermissionsSchema(value: unknown): PermissionsSchema {
	const storedValue =
		value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	const stored = { ...storedValue };
	for (const [toolName, entry] of Object.entries(storedValue)) {
		const currentName = currentToolName(toolName);
		if (currentName === toolName) continue;
		if (!Object.hasOwn(stored, currentName)) stored[currentName] = entry;
		delete stored[toolName];
	}
	const unknownPermission: ToolPermission = {
		default: 'ask',
		allow: [],
		deny: [],
		ask: [],
	};
	const directories = normalizeDirectoryPermissions(stored.dir);
	for (const permission of Object.values(directories)) {
		if (permission.tools === '*') continue;
		permission.tools = [...new Set(permission.tools.map(currentToolName))];
	}
	const result: PermissionsSchema = {
		dir: directories,
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
