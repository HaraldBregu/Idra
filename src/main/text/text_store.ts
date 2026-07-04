import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type TextStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const TEXT_STORE_NAME = 'settings';

const DEFAULT_TEXT_STORE: TextStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<TextStoreState>({
	name: TEXT_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'text'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_TEXT_STORE,
});

export function getTextStore(): TextStoreState {
	return store.store;
}

export function setTextStore(value: TextStoreState): void {
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
