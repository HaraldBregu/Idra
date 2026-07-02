import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user-data-location';

export type SpeechStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const SPEECH_STORE_NAME = 'settings';

const DEFAULT_SPEECH_STORE: SpeechStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<SpeechStoreState>({
	name: SPEECH_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'speech'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SPEECH_STORE,
});

export function getSpeechStore(): SpeechStoreState {
	return store.store;
}

export function setSpeechStore(value: SpeechStoreState): void {
	store.store = value;
}

export function getProviderId(): string | undefined {
	return optionalTrimmedString(store.get('providerId'));
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function getModelId(): string | undefined {
	return optionalTrimmedString(store.get('modelId'));
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
