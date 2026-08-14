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
	large_language_model: AgentMediaModelSettings;
	web_search_engine: SearchEngineSettings;
	image_generator_model: AgentMediaModelSettings;
	audio_generator_model: AgentMediaModelSettings;
	video_generator_model: AgentMediaModelSettings;
	text_to_speech_model: AgentMediaModelSettings;
	realtime_voice_model: AgentMediaModelSettings;
	permissions: PermissionsSchema;
};

type LegacyAgentStoreSchema = Partial<AgentStoreSchema> & {
	providerId?: string;
	modelId?: string;
	modelOptions?: Record<string, unknown>;
	search_engine?: SearchEngineSettings;
	image_model?: AgentMediaModelSettings;
	audio_model?: AgentMediaModelSettings;
	video_model?: AgentMediaModelSettings;
	voice_model?: AgentMediaModelSettings;
};

const AGENT_STORE_NAME = 'agent';
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
	large_language_model: EMPTY_MEDIA_MODEL,
	web_search_engine: { providerId: '', providerName: '', enabled: false },
	image_generator_model: EMPTY_MEDIA_MODEL,
	audio_generator_model: EMPTY_MEDIA_MODEL,
	video_generator_model: EMPTY_MEDIA_MODEL,
	text_to_speech_model: EMPTY_MEDIA_MODEL,
	realtime_voice_model: EMPTY_MEDIA_MODEL,
	permissions: DEFAULT_AGENT_PERMISSIONS,
};

type MediaModelKey =
	| 'image_generator_model'
	| 'audio_generator_model'
	| 'video_generator_model'
	| 'text_to_speech_model'
	| 'realtime_voice_model';

const MEDIA_MODEL_KEYS: Record<AgentMediaModelKind, MediaModelKey> = {
	image: 'image_generator_model',
	audio: 'audio_generator_model',
	video: 'video_generator_model',
	voice: 'text_to_speech_model',
	realtimeVoice: 'realtime_voice_model',
};

const store = new Store<AgentStoreSchema>({
	name: AGENT_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_STORE,
});

const persisted = { ...store.store } as LegacyAgentStoreSchema;
const largeLanguageModel =
	persisted.large_language_model?.providerId || persisted.large_language_model?.modelId
		? persisted.large_language_model
		: {
				providerId: persisted.providerId ?? '',
				modelId: persisted.modelId ?? '',
				options: persisted.modelOptions ?? {},
			};
store.store = {
	large_language_model: largeLanguageModel,
	web_search_engine:
		persisted.web_search_engine ?? persisted.search_engine ?? DEFAULT_AGENT_STORE.web_search_engine,
	image_generator_model:
		persisted.image_generator_model ?? persisted.image_model ?? EMPTY_MEDIA_MODEL,
	audio_generator_model:
		persisted.audio_generator_model ?? persisted.audio_model ?? EMPTY_MEDIA_MODEL,
	video_generator_model:
		persisted.video_generator_model ?? persisted.video_model ?? EMPTY_MEDIA_MODEL,
	text_to_speech_model:
		persisted.text_to_speech_model ?? persisted.voice_model ?? EMPTY_MEDIA_MODEL,
	realtime_voice_model: persisted.realtime_voice_model ?? EMPTY_MEDIA_MODEL,
	permissions: persisted.permissions ?? DEFAULT_AGENT_PERMISSIONS,
};

export function getProviderId(): string | undefined {
	return store.get('large_language_model').providerId || undefined;
}

export function setProviderId(providerId: string): void {
	store.set('large_language_model', { ...store.get('large_language_model'), providerId });
}

export function getModelId(): string | undefined {
	return store.get('large_language_model').modelId || undefined;
}

export function setModelId(modelId: string): void {
	store.set('large_language_model', { ...store.get('large_language_model'), modelId });
}

export function getModelOptions(): Record<string, unknown> {
	return store.get('large_language_model').options;
}

export function setModelOptions(modelOptions: Record<string, unknown>): void {
	store.set('large_language_model', {
		...store.get('large_language_model'),
		options: modelOptions,
	});
}

export function getSearchEngine(): SearchEngineSettings {
	return store.get('web_search_engine');
}

export function setSearchEngine(searchEngine: SearchEngineSettings): void {
	store.set('web_search_engine', searchEngine);
}

export function getMediaModel(kind: AgentMediaModelKind): AgentMediaModelSettings {
	return store.get(MEDIA_MODEL_KEYS[kind]);
}

export function setMediaModel(kind: AgentMediaModelKind, settings: AgentMediaModelSettings): void {
	store.set(MEDIA_MODEL_KEYS[kind], settings);
}

export function getPermissions(): PermissionsSchema {
	return withWorkspacePermissions(
		normalizePermissionsSchema(store.get('permissions'), DEFAULT_AGENT_PERMISSIONS),
		workspacePattern
	);
}

export function setPermissions(permissions: PermissionsSchema): PermissionsSchema {
	store.set(
		'permissions',
		withWorkspacePermissions(
			normalizePermissionsSchema(permissions, DEFAULT_AGENT_PERMISSIONS),
			workspacePattern
		)
	);
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
	return getPermissions();
}
