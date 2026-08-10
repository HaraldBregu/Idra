import { isToolPermission } from './is_tool_permission';
import { normalizeToolPermission } from './normalize_tool_permission';
import { normalizeDirectoryPermissions } from './normalize_directory_permissions';
import {
	DEFAULT_TOOL_PERMISSIONS,
	type PermissionsSchema,
	type ToolPermission,
} from './permissions_types';

export function normalizePermissionsSchema(value: unknown): PermissionsSchema {
	const storedValue =
		value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	const unknownPermission: ToolPermission = {
		default: 'ask',
		allow: [],
		deny: [],
		ask: [],
	};
	const storedTools =
		storedValue.tools && typeof storedValue.tools === 'object' && !Array.isArray(storedValue.tools)
			? (storedValue.tools as Record<string, unknown>)
			: {};
	const result: PermissionsSchema = {
		tools: {},
		directories: normalizeDirectoryPermissions(storedValue.directories ?? storedValue.dir),
	};
	for (const [toolName, fallback] of Object.entries(DEFAULT_TOOL_PERMISSIONS)) {
		const value = Object.prototype.hasOwnProperty.call(storedTools, toolName)
			? storedTools[toolName]
			: storedValue[toolName];
		result.tools[toolName] = normalizeToolPermission(value, fallback);
	}
	for (const [toolName, entry] of Object.entries(storedValue)) {
		if (
			toolName === 'dir' ||
			toolName === 'directories' ||
			toolName === 'mode' ||
			toolName === 'tools' ||
			result.tools[toolName] ||
			!isToolPermission(entry)
		) {
			continue;
		}
		result.tools[toolName] = normalizeToolPermission(entry, unknownPermission);
	}
	for (const [toolName, entry] of Object.entries(storedTools)) {
		if (!isToolPermission(entry)) continue;
		result.tools[toolName] = normalizeToolPermission(
			entry,
			result.tools[toolName] ?? unknownPermission
		);
	}
	return result;
}
