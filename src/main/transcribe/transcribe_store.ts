import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type TranscribeMode = 'realtime' | 'transcribe';

export type TranscribeSelection = {
	providerId: string | undefined;
	modelId: string | undefined;
};

export type TranscribeStoreState = {
	realtime: TranscribeSelection;
	transcribe: TranscribeSelection;
};

const TRANSCRIBE_STORE_NAME = 'settings';

const DEFAULT_SELECTION: TranscribeSelection = {
	providerId: undefined,
	modelId: undefined,
};

const DEFAULT_TRANSCRIBE_STORE: TranscribeStoreState = {
	realtime: DEFAULT_SELECTION,
	transcribe: DEFAULT_SELECTION,
};

const store = new Store<TranscribeStoreState>({
	name: TRANSCRIBE_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'transcribe'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_TRANSCRIBE_STORE,
});

export function getTranscribeStore(): TranscribeStoreState {
	return store.store;
}

export function setTranscribeStore(value: TranscribeStoreState): void {
	store.store = value;
}

export function getProviderId(mode: TranscribeMode = 'transcribe'): string | undefined {
	return optionalTrimmedString(store.get(mode)?.providerId);
}

export function setProviderId(providerId: string, mode: TranscribeMode = 'transcribe'): void {
	store.set(mode, { ...store.get(mode), providerId });
}

export function getModelId(mode: TranscribeMode = 'transcribe'): string | undefined {
	return optionalTrimmedString(store.get(mode)?.modelId);
}

export function setModelId(modelId: string, mode: TranscribeMode = 'transcribe'): void {
	store.set(mode, { ...store.get(mode), modelId });
}

export function setSelection(providerId: string, modelId: string, mode: TranscribeMode = 'transcribe'): void {
	store.set(mode, { providerId, modelId });
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
