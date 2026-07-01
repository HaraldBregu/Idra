import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user-data-location';

export type VoiceMode = 'realtime' | 'transcribe';

export type VoiceSelection = {
	providerId: string | undefined;
	modelId: string | undefined;
};

export type VoiceStoreState = {
	realtime: VoiceSelection;
	transcribe: VoiceSelection;
};

const VOICE_STORE_NAME = 'settings';

const DEFAULT_SELECTION: VoiceSelection = {
	providerId: undefined,
	modelId: undefined,
};

const DEFAULT_VOICE_STORE: VoiceStoreState = {
	realtime: DEFAULT_SELECTION,
	transcribe: DEFAULT_SELECTION,
};

const store = new Store<VoiceStoreState>({
	name: VOICE_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'voice'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_VOICE_STORE,
});

export function getVoiceStore(): VoiceStoreState {
	return store.store;
}

export function setVoiceStore(value: VoiceStoreState): void {
	store.store = value;
}

export function getProviderId(mode: VoiceMode): string | undefined {
	return optionalTrimmedString(store.get(mode)?.providerId);
}

export function setProviderId(mode: VoiceMode, providerId: string): void {
	store.set(mode, { ...store.get(mode), providerId });
}

export function getModelId(mode: VoiceMode): string | undefined {
	return optionalTrimmedString(store.get(mode)?.modelId);
}

export function setModelId(mode: VoiceMode, modelId: string): void {
	store.set(mode, { ...store.get(mode), modelId });
}

export function setSelection(mode: VoiceMode, providerId: string, modelId: string): void {
	store.set(mode, { providerId, modelId });
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
