import path from 'node:path';
import Store from 'electron-store';
import type { AgentMediaModelKind, AgentMediaModelSettings } from '../../shared/agent_types';
import { agentLocation } from '../shared/agent_location';
import { userDataLocation } from '../shared/user_data_location';
import { normalizePermissionsSchema } from './permissions/normalize_permissions_schema';
import {
	type PermissionBucket,
	type PermissionKind,
	type PermissionsSchema,
} from './permissions/permissions_types';
import { withWorkspacePermissions } from './permissions/with_workspace_permissions';

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
	voice_model: AgentMediaModelSettings;
	realtime_voice_model: AgentMediaModelSettings;
	permissions: PermissionsSchema;
	permissionsVersion?: number;
};

const AGENT_STORE_NAME = 'agent';
const PERMISSIONS_VERSION = 2;
const settingsDirectory = path.resolve(userDataLocation(), 'settings');
export const AGENT_DIRECTORY = path.resolve(agentLocation());
const workspacePattern = `${AGENT_DIRECTORY.replaceAll(path.sep, '/')}/**`;
const DEFAULT_AGENT_PERMISSIONS: PermissionsSchema = {
	read: { allow: [workspacePattern], deny: [] },
	write: { allow: [workspacePattern], deny: [] },
	exec: { allow: [workspacePattern], deny: [] },
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
	voice_model: EMPTY_MEDIA_MODEL,
	realtime_voice_model: EMPTY_MEDIA_MODEL,
	permissions: DEFAULT_AGENT_PERMISSIONS,
};

const MEDIA_MODEL_KEYS: Record<
	AgentMediaModelKind,
	'image_model' | 'audio_model' | 'video_model' | 'voice_model' | 'realtime_voice_model'
> = {
	image: 'image_model',
	audio: 'audio_model',
	video: 'video_model',
	voice: 'voice_model',
	realtimeVoice: 'realtime_voice_model',
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
	return store.get(MEDIA_MODEL_KEYS[kind]);
}

export function setMediaModel(kind: AgentMediaModelKind, settings: AgentMediaModelSettings): void {
	store.set(MEDIA_MODEL_KEYS[kind], settings);
}

export function getPermissions(): PermissionsSchema {
	const normalized = normalizePermissionsSchema(store.get('permissions'), DEFAULT_AGENT_PERMISSIONS);
	const permissions = withWorkspacePermissions(
		store.get('permissionsVersion') === PERMISSIONS_VERSION
			? normalized
			: { ...normalized, exec: DEFAULT_AGENT_PERMISSIONS.exec },
		workspacePattern
	);
	if (store.get('permissionsVersion') !== PERMISSIONS_VERSION) {
		store.set('permissions', permissions);
		store.set('permissionsVersion', PERMISSIONS_VERSION);
	}
	return permissions;
}

export function setPermissions(permissions: PermissionsSchema): PermissionsSchema {
	store.set(
		'permissions',
		withWorkspacePermissions(
			normalizePermissionsSchema(permissions, DEFAULT_AGENT_PERMISSIONS),
			workspacePattern
		)
	);
	store.set('permissionsVersion', PERMISSIONS_VERSION);
	return getPermissions();
}

export function addPermissionRule(
	kind: PermissionKind,
	bucket: PermissionBucket,
	rule: string
): void {
	const permissions = getPermissions();
	const permission = permissions[kind];
	if (permission[bucket].includes(rule)) return;
	setPermissions({
		...permissions,
		[kind]: { ...permission, [bucket]: [...permission[bucket], rule] },
	});
}

export function resetPermissions(): PermissionsSchema {
	store.set('permissions', DEFAULT_AGENT_PERMISSIONS);
	store.set('permissionsVersion', PERMISSIONS_VERSION);
	return getPermissions();
}
