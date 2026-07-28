import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';

export type VideoStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const VIDEO_STORE_NAME = 'settings';

const DEFAULT_VIDEO_STORE: VideoStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<VideoStoreState>({
	name: VIDEO_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'video'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_VIDEO_STORE,
});

export function getVideoStore(): VideoStoreState {
	return store.store;
}

export function setVideoStore(value: VideoStoreState): void {
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
