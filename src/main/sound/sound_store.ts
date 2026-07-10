import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type SoundStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const SOUND_STORE_NAME = 'settings';

const DEFAULT_SOUND_STORE: SoundStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<SoundStoreState>({
	name: SOUND_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'sound'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SOUND_STORE,
});

export function getSoundStore(): SoundStoreState {
	return store.store;
}

export function setSoundStore(value: SoundStoreState): void {
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
