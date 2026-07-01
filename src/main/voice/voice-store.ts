import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../agent/shared/agent-location';

export type VoiceStoreState = {
	providerId: string | undefined;
	modelId: string | undefined;
};

const VOICE_STORE_NAME = 'voice';

const DEFAULT_VOICE_STORE: VoiceStoreState = {
	providerId: undefined,
	modelId: undefined,
};

const store = new Store<VoiceStoreState>({
	name: VOICE_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_VOICE_STORE,
});

export function getVoiceStore(): VoiceStoreState {
	return store.store;
}

export function setVoiceStore(value: VoiceStoreState): void {
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

export function setSelection(providerId: string, modelId: string): void {
	store.set('providerId', providerId);
	store.set('modelId', modelId);
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
