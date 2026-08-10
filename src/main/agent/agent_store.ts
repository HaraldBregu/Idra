import path from 'node:path';
import Store from 'electron-store';
import type {
	AgentMediaModelKind,
	AgentMediaModelSettings,
} from '../../shared/agent_types';
import { agentLocation } from '../shared/agent_location';
import { userDataLocation } from '../shared/user_data_location';
import { isToolPermission } from './permissions/is_tool_permission';
import { normalizeToolPermission } from './permissions/normalize_tool_permission';
import { normalizeDirectoryPermissions } from './permissions/normalize_directory_permissions';
import { normalizePermissionsSchema } from './permissions/normalize_permissions_schema';
import {
	DEFAULT_PERMISSIONS,
	type DirectoryPermissions,
	type PermissionBucket,
	type PermissionsSchema,
	type ToolPermission,
} from './permissions/permissions_types';

export type SearchEngineSettings = {
	providerId: string;
	providerName: string;
	enabled: boolean;
};
type AgentStoreSchema = {
	providerId: string | undefined;
	modelId: string | undefined;
	modelOptions: Record<string, unknown>;
	search_engine: SearchEngineSettings;
	image_model: AgentMediaModelSettings;
	audio_model: AgentMediaModelSettings;
	video_model: AgentMediaModelSettings;
	permissions: PermissionsSchema;
};

const AGENT_STORE_NAME = 'agent';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');
export const AGENT_DIRECTORY = path.resolve(agentLocation());
const UNKNOWN_TOOL_PERMISSION: ToolPermission = {
	default: 'ask',
	allow: [],
	deny: [],
	ask: [],
};
const EMPTY_MEDIA_MODEL: AgentMediaModelSettings = {
	providerId: '',
	modelId: '',
	options: {},
};
const DEFAULT_AGENT_STORE: AgentStoreSchema = {
	providerId: undefined,
	modelId: undefined,
	modelOptions: {},
	search_engine: { providerId: '', providerName: '', enabled: false },
	image_model: EMPTY_MEDIA_MODEL,
	audio_model: EMPTY_MEDIA_MODEL,
	video_model: EMPTY_MEDIA_MODEL,
	permissions: DEFAULT_PERMISSIONS,
};

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

export function getModelOptions(): Record<string, unknown> {
	return store.get('modelOptions');
}

export function setModelOptions(modelOptions: Record<string, unknown>): void {
	store.set('modelOptions', modelOptions);
}

export function getSearchEngine(): SearchEngineSettings {
	return store.get('search_engine');
}

export function setSearchEngine(searchEngine: SearchEngineSettings): void {
	store.set('search_engine', searchEngine);
}

export function getMediaModel(kind: AgentMediaModelKind): AgentMediaModelSettings {
	return store.get(`${kind}_model`);
}

export function setMediaModel(kind: AgentMediaModelKind, settings: AgentMediaModelSettings): void {
	store.set(`${kind}_model`, settings);
}

export function getPermissions(): PermissionsSchema {
	return normalizePermissionsSchema(store.get('permissions'));
}

export function getToolPermission(toolName: string): ToolPermission {
	const permission = getPermissions().tools[toolName];
	return isToolPermission(permission) ? permission : { ...UNKNOWN_TOOL_PERMISSION };
}

export function setToolPermission(toolName: string, permission: ToolPermission): PermissionsSchema {
	const permissions = getPermissions();
	store.set('permissions', {
		...permissions,
		tools: {
			...permissions.tools,
			[toolName]: normalizeToolPermission(permission, UNKNOWN_TOOL_PERMISSION),
		},
	});
	return getPermissions();
}

export function setDirectoryPermissions(directories: DirectoryPermissions): PermissionsSchema {
	store.set('permissions', {
		...getPermissions(),
		directories: normalizeDirectoryPermissions(directories),
	});
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
	store.set('permissions', DEFAULT_PERMISSIONS);
	return getPermissions();
}
