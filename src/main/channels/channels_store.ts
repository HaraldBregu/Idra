import path from 'node:path';
import Store from 'electron-store';
import type { ChannelModelKind, ChannelModelSelection, StoredBotProvider } from '../../shared';
import { userDataLocation } from '../shared/user_data_location';
import { getModelId, getProviderId } from '../models/models_store';
import { normalizePermissionsSchema } from '../agent/permissions/permissions_normalize_schema';
import type { PermissionsSchema } from '../agent/permissions/permissions_types';
import { DEFAULT_CHANNEL_PERMISSIONS } from './permissions';

type ChannelModelKeys = {
	providerId: keyof ChannelsStoreState;
	modelId: keyof ChannelsStoreState;
};

const CHANNEL_MODEL_KEYS: Record<ChannelModelKind, ChannelModelKeys> = {
	llm: {
		providerId: 'llmProviderId',
		modelId: 'llmModelId',
	},
	stt: {
		providerId: 'sttProviderId',
		modelId: 'sttModelId',
	},
	tts: {
		providerId: 'ttsProviderId',
		modelId: 'ttsModelId',
	},
} as const;

export interface ChannelsStoreState {
	readonly providers: StoredBotProvider[];
	readonly llmProviderId?: string;
	readonly llmModelId?: string;
	readonly sttProviderId?: string;
	readonly sttModelId?: string;
	readonly ttsProviderId?: string;
	readonly ttsModelId?: string;
	readonly permissions?: PermissionsSchema;
}

const CHANNEL_MODELS_FALLBACKS: Record<ChannelModelKind, () => ChannelModelSelection> = {
	llm: () => ({ providerId: getProviderId('text'), modelId: getModelId('text') }),
	stt: () => ({ providerId: getProviderId('transcribe'), modelId: getModelId('transcribe') }),
	tts: () => ({ providerId: getProviderId('voice'), modelId: getModelId('voice') }),
};

const store = new Store<ChannelsStoreState>({
	name: 'channels',
	cwd: path.resolve(userDataLocation(), 'settings'),
	accessPropertiesByDotNotation: false,
	defaults: {
		providers: [],
	},
});

export const channelsStorePath = store.path;

function trimValue(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function listChannelProviders(): StoredBotProvider[] {
	return store.get('providers');
}

export function getChannelProvider(id: string): StoredBotProvider | undefined {
	return listChannelProviders().find((provider) => provider.id === id);
}

export function setChannelProvider(provider: StoredBotProvider): StoredBotProvider {
	const providers = listChannelProviders();
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	store.set('providers', providers);
	return provider;
}

export function getChannelModelSelection(kind: ChannelModelKind): ChannelModelSelection {
	const keys = CHANNEL_MODEL_KEYS[kind];
	const fallback = CHANNEL_MODELS_FALLBACKS[kind]();
	const providerId = trimValue(store.get(keys.providerId)) ?? trimValue(fallback.providerId);
	const modelId = trimValue(store.get(keys.modelId)) ?? trimValue(fallback.modelId);

	return {
		providerId,
		modelId,
	};
}

export function setChannelModelSelection(
	kind: ChannelModelKind,
	selection: ChannelModelSelection
): void {
	const keys = CHANNEL_MODEL_KEYS[kind];
	store.set(keys.providerId, trimValue(selection.providerId) ?? '');
	store.set(keys.modelId, trimValue(selection.modelId) ?? '');
}

export function getChannelModelSelections(): Record<ChannelModelKind, ChannelModelSelection> {
	const selections: Record<ChannelModelKind, ChannelModelSelection> = {
		llm: getChannelModelSelection('llm'),
		stt: getChannelModelSelection('stt'),
		tts: getChannelModelSelection('tts'),
	};
	return selections;
}

export function setChannelModelSelections(
	selections: Partial<Record<ChannelModelKind, ChannelModelSelection>>
): void {
	for (const kind of ['llm', 'stt', 'tts'] as const) {
		const selection = selections[kind];
		if (!selection) continue;
		setChannelModelSelection(kind, selection);
	}
}

export function getChannelPermissions(): PermissionsSchema {
	const permissions = normalizePermissionsSchema(
		store.has('permissions') ? store.get('permissions') : DEFAULT_CHANNEL_PERMISSIONS
	);
	if (!store.has('permissions')) store.set('permissions', permissions);
	return permissions;
}

export function saveChannelPermissions(value: unknown): PermissionsSchema {
	const permissions = normalizePermissionsSchema(value);
	store.set('permissions', permissions);
	return permissions;
}

export function resetChannelPermissions(): PermissionsSchema {
	return saveChannelPermissions(DEFAULT_CHANNEL_PERMISSIONS);
}
