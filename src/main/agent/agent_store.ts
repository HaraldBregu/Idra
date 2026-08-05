import path from 'node:path';
import Store from 'electron-store';
import type { AgentPermissionMode } from '../../shared/agent_types';
import { agentLocation } from '../shared/agent_location';
import { userDataLocation } from '../shared/user_data_location';
import { isToolPermission } from './policy/policy_is_tool_permission';
import { normalizeToolPermission } from './policy/policy_normalize';
import { normalizeDirectoryPermissions } from './policy/policy_normalize_directories';
import {
	DEFAULT_PERMISSIONS,
	DEFAULT_TOOL_PERMISSIONS,
	type DirectoryPermissions,
	type PermissionBucket,
	type PermissionsSchema,
	type ToolPermission,
} from './policy/policy_types';

export type SearchEngineSettings = {
	providerId: string;
	providerName: string;
	enabled: boolean;
};
type AgentStoreSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
	search_engine: SearchEngineSettings;
	permissions: PermissionsSchema;
};

const AGENT_STORE_NAME = 'agent';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const UNKNOWN_TOOL_PERMISSION: ToolPermission = {
	default: 'ask',
	allow: [],
	deny: [],
	ask: [],
};
const DEFAULT_AGENT_STORE: AgentStoreSchema = {
	providerId: undefined,
	modelId: undefined,
	search_engine: { providerId: '', providerName: '', enabled: false },
	permissions: DEFAULT_PERMISSIONS,
};

export const AGENT_DIRECTORY = path.resolve(agentLocation());

const store = new Store<AgentStoreSchema>({
	name: AGENT_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_STORE,
});

export function getProviderId(): string | undefined {
	return store.get('providerId');
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}

export function getSearchEngine(): SearchEngineSettings {
	return store.get('search_engine');
}

export function setSearchEngine(searchEngine: SearchEngineSettings): void {
	store.set('search_engine', searchEngine);
}

export function getPermissions(): PermissionsSchema {
	const stored = store.get('permissions') as Record<string, unknown>;
	const result: PermissionsSchema = {
		dir: normalizeDirectoryPermissions(stored.dir),
		mode: stored.mode === 'bypass' ? 'bypass' : 'ask',
	};
	for (const [toolName, fallback] of Object.entries(DEFAULT_TOOL_PERMISSIONS))
		result[toolName] = normalizeToolPermission(stored[toolName], fallback);
	for (const [toolName, value] of Object.entries(stored)) {
		if (toolName === 'dir' || toolName === 'mode' || result[toolName] || !isToolPermission(value))
			continue;
		result[toolName] = normalizeToolPermission(value, UNKNOWN_TOOL_PERMISSION);
	}
	return result;
}

export function getDirectoryPermissions(): DirectoryPermissions {
	return getPermissions().dir;
}

export function getPermissionMode(): AgentPermissionMode {
	return getPermissions().mode;
}

export function getToolPermission(toolName: string): ToolPermission {
	const permission = getPermissions()[toolName];
	return isToolPermission(permission) ? permission : { ...UNKNOWN_TOOL_PERMISSION };
}

export function setToolPermission(toolName: string, permission: ToolPermission): PermissionsSchema {
	if (toolName === 'dir' || toolName === 'mode')
		throw new Error(`'${toolName}' is reserved for policy settings.`);
	store.set('permissions', {
		...getPermissions(),
		[toolName]: normalizeToolPermission(permission, UNKNOWN_TOOL_PERMISSION),
	});
	return getPermissions();
}

export function setPermissionMode(mode: AgentPermissionMode): PermissionsSchema {
	store.set('permissions', { ...getPermissions(), mode });
	return getPermissions();
}

export function setDirectoryPermissions(directories: DirectoryPermissions): PermissionsSchema {
	store.set('permissions', {
		...getPermissions(),
		dir: normalizeDirectoryPermissions(directories),
	});
	return getPermissions();
}

export function addPermissionRule(
	toolName: string,
	bucket: PermissionBucket,
	rule: string
): void {
	const permission = getToolPermission(toolName);
	if (permission[bucket].includes(rule)) return;
	setToolPermission(toolName, {
		...permission,
		[bucket]: [...permission[bucket], rule],
	});
}

export function resetPermissions(): PermissionsSchema {
	store.set('permissions', DEFAULT_PERMISSIONS);
	return getPermissions();
}
