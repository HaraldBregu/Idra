import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import { userDataLocation } from '../../shared/user_data_location';
import { isToolPermission } from './policy_is_tool_permission';
import { normalizeDirectoryPermissions } from './policy_normalize_directories';
import { normalizeToolPermission } from './policy_normalize';
import {
	DEFAULT_PERMISSIONS,
	DEFAULT_TOOL_PERMISSIONS,
	type DirectoryPermissions,
	type PermissionBucket,
	type PermissionsSchema,
	type ToolPermission,
} from './policy_types';

const POLICY_STORE_NAME = 'settings.policy';
const UNKNOWN_TOOL_PERMISSION: ToolPermission = {
	default: 'ask',
	allow: [],
	deny: [],
	ask: [],
};

export const AGENT_DIRECTORY = path.resolve(agentLocation());

const store = new Store<PermissionsSchema>({
	name: POLICY_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'agent'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_PERMISSIONS,
});

export function getPermissions(): PermissionsSchema {
	const stored = store.store as Record<string, unknown>;
	const result: PermissionsSchema = { dir: normalizeDirectoryPermissions(stored.dir) };
	for (const [toolName, fallback] of Object.entries(DEFAULT_TOOL_PERMISSIONS))
		result[toolName] = normalizeToolPermission(stored[toolName], fallback);
	for (const [toolName, value] of Object.entries(stored)) {
		if (toolName === 'dir' || result[toolName] || !isToolPermission(value)) continue;
		result[toolName] = normalizeToolPermission(value, UNKNOWN_TOOL_PERMISSION);
	}
	return result;
}

export function getDirectoryPermissions(): DirectoryPermissions {
	return getPermissions().dir;
}

export function getToolPermission(toolName: string): ToolPermission {
	const permission = getPermissions()[toolName];
	return isToolPermission(permission) ? permission : { ...UNKNOWN_TOOL_PERMISSION };
}

export function setToolPermission(toolName: string, permission: ToolPermission): PermissionsSchema {
	if (toolName === 'dir') throw new Error("'dir' is reserved for directory permissions.");
	store.store = {
		...getPermissions(),
		[toolName]: normalizeToolPermission(permission, UNKNOWN_TOOL_PERMISSION),
	};
	return getPermissions();
}

export function setDirectoryPermissions(directories: DirectoryPermissions): PermissionsSchema {
	store.store = { ...getPermissions(), dir: normalizeDirectoryPermissions(directories) };
	return getPermissions();
}

export function addPermissionRule(toolName: string, bucket: PermissionBucket, rule: string): void {
	const permission = getToolPermission(toolName);
	if (permission[bucket].includes(rule)) return;
	setToolPermission(toolName, {
		...permission,
		[bucket]: [...permission[bucket], rule],
	});
}

export function resetPermissions(): PermissionsSchema {
	store.store = DEFAULT_PERMISSIONS;
	return getPermissions();
}
