import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

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

export function getProviderId(mode: VoiceMode = 'transcribe'): string | undefined {
	return optionalTrimmedString(store.get(mode)?.providerId);
}

export function setProviderId(providerId: string, mode: VoiceMode = 'transcribe'): void {
	store.set(mode, { ...store.get(mode), providerId });
}

export function getModelId(mode: VoiceMode = 'transcribe'): string | undefined {
	return optionalTrimmedString(store.get(mode)?.modelId);
}

export function setModelId(modelId: string, mode: VoiceMode = 'transcribe'): void {
	store.set(mode, { ...store.get(mode), modelId });
}

export function setSelection(providerId: string, modelId: string, mode: VoiceMode = 'transcribe'): void {
	store.set(mode, { providerId, modelId });
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}
