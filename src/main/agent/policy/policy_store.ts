import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import { normalizeToolPermission } from './policy_normalize';
import {
	DEFAULT_PERMISSIONS,
	type PermissionBucket,
	type PermissionsSchema,
	type ToolPermission,
} from './policy_types';

const POLICY_STORE_NAME = 'policy';
const UNKNOWN_TOOL_PERMISSION: ToolPermission = {
	default: 'ask',
	allow: [],
	deny: [],
	ask: [],
};

export const AGENT_DIRECTORY = path.resolve(agentLocation());

const store = new Store<PermissionsSchema>({
	name: POLICY_STORE_NAME,
	cwd: AGENT_DIRECTORY,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_PERMISSIONS,
});

export function getPermissions(): PermissionsSchema {
	const stored = store.store as Record<string, unknown>;
	const result: PermissionsSchema = {};
	for (const [toolName, fallback] of Object.entries(DEFAULT_PERMISSIONS))
		result[toolName] = normalizeToolPermission(stored[toolName], fallback);
	for (const [toolName, value] of Object.entries(stored)) {
		if (result[toolName] || !value || typeof value !== 'object' || Array.isArray(value)) continue;
		const entry = value as Record<string, unknown>;
		if (!('default' in entry)) continue;
		result[toolName] = normalizeToolPermission(value, UNKNOWN_TOOL_PERMISSION);
	}
	return result;
}

export function getToolPermission(toolName: string): ToolPermission {
	return getPermissions()[toolName] ?? { ...UNKNOWN_TOOL_PERMISSION };
}

export function setToolPermission(toolName: string, permission: ToolPermission): PermissionsSchema {
	store.set(toolName, normalizeToolPermission(permission, UNKNOWN_TOOL_PERMISSION));
	return getPermissions();
}

export function addPermissionRule(
	toolName: string,
	bucket: PermissionBucket,
	rule: string,
): void {
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
