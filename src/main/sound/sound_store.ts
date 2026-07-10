import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type MusicStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const MUSIC_STORE_NAME = 'settings';

const DEFAULT_MUSIC_STORE: MusicStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<MusicStoreState>({
	name: MUSIC_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'music'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_MUSIC_STORE,
});

export function getMusicStore(): MusicStoreState {
	return store.store;
}

export function setMusicStore(value: MusicStoreState): void {
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
