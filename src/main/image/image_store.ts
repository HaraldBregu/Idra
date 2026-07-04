import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type CreatorStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const CREATOR_STORE_NAME = 'settings';

const DEFAULT_CREATOR_STORE: CreatorStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<CreatorStoreState>({
	name: CREATOR_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'creator'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_CREATOR_STORE,
});

export function getCreatorStore(): CreatorStoreState {
	return store.store;
}

export function setCreatorStore(value: CreatorStoreState): void {
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
