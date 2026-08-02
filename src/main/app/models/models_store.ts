import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';

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

const MODELS_STORE_NAME = 'settings';

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

const store = new Store<ModelsStoreState>({
	name: MODELS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'models'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_MODELS_STORE,
});

export function getModelsStore(): ModelsStoreState {
	return store.store;
}

export function setModelsStore(value: ModelsStoreState): void {
	store.store = value;
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
