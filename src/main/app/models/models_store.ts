import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredProvider } from '../../../shared/provider_types';

export type ModelKind =
	| 'text'
	| 'sound'
	| 'image'
	| 'video'
	| 'voice'
	| 'transcribe'
	| 'realtime'
	| 'embedding';

export type ModelSelection = {
	providerId: string;
	modelId: string;
};

export type ModelsStoreState = Record<ModelKind, ModelSelection>;

type PersistedModelsStoreState = ModelsStoreState & {
	providers: StoredProvider[];
};

const MODELS_SETTINGS_DIRECTORY = path.resolve(userDataLocation(), 'settings');

const EMPTY_SELECTION: ModelSelection = {
	providerId: '',
	modelId: '',
};

const DEFAULT_MODELS_STORE: ModelsStoreState = {
	text: EMPTY_SELECTION,
	sound: EMPTY_SELECTION,
	image: EMPTY_SELECTION,
	video: EMPTY_SELECTION,
	voice: EMPTY_SELECTION,
	transcribe: EMPTY_SELECTION,
	realtime: EMPTY_SELECTION,
	embedding: EMPTY_SELECTION,
};

const DEFAULT_PERSISTED_MODELS_STORE: PersistedModelsStoreState = {
	...DEFAULT_MODELS_STORE,
	providers: [],
};

const store = new Store<PersistedModelsStoreState>({
	name: 'models',
	cwd: MODELS_SETTINGS_DIRECTORY,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_PERSISTED_MODELS_STORE,
});

export function getModelsStore(): ModelsStoreState {
	const { providers: _providers, ...selections } = store.store;
	return selections;
}

export function setModelsStore(value: ModelsStoreState): void {
	store.store = { ...store.store, ...value };
}

export function getModelProviders(): StoredProvider[] {
	return store.get('providers').filter(isStoredProvider);
}

export function setModelProviders(providers: StoredProvider[]): void {
	store.set('providers', providers.filter(isStoredProvider));
}

export function getProviderId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(store.get(kind)?.providerId);
}

export function setProviderId(kind: ModelKind, providerId: string): void {
	store.set(kind, { ...selection(kind), providerId });
}

export function getModelId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(store.get(kind)?.modelId);
}

export function setModelId(kind: ModelKind, modelId: string): void {
	store.set(kind, { ...selection(kind), modelId });
}

export function setSelection(kind: ModelKind, providerId: string, modelId: string): void {
	store.set(kind, { providerId, modelId });
}

function selection(kind: ModelKind): ModelSelection {
	return store.get(kind) ?? EMPTY_SELECTION;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isStoredProvider(value: unknown): value is StoredProvider {
	if (typeof value !== 'object' || value === null) return false;
	const provider = value as Partial<StoredProvider>;
	return (
		typeof provider.id === 'string' &&
		typeof provider.name === 'string' &&
		typeof provider.apiKey === 'string' &&
		typeof provider.baseUrl === 'string'
	);
}
