import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type ImageStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const IMAGE_STORE_NAME = 'settings';

const DEFAULT_IMAGE_STORE: ImageStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<ImageStoreState>({
	name: IMAGE_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'image'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_IMAGE_STORE,
});

export function getImageStore(): ImageStoreState {
	return store.store;
}

export function setImageStore(value: ImageStoreState): void {
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
