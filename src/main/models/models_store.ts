import type { StoredProvider } from '../../shared/provider_types';
import {
	getMediaModel,
	getModelId as getAgentModelId,
	getProviderId as getAgentProviderId,
	setMediaModel,
	setModelId as setAgentModelId,
	setProviderId as setAgentProviderId,
} from '../agent/agent_store';
import type { AgentMediaModelKind } from '../../shared/agent_types';
import {
	getAppModelSelections,
	setAppModelSelections,
	type AppModelSelections,
	type ModelKind,
	type ModelSelection,
	type ModelsStoreState,
} from '../settings_store';
import { getModelProvidersState, setModelProvidersState } from '../providers/providers_index';
import { getRagConfiguration, saveRagConfiguration } from '../agent/knowledge/rag/rag_store';

export type { ModelKind, ModelSelection, ModelsStoreState } from '../settings_store';

export type MediaModelKind = 'image' | 'sound' | 'video';

const EMPTY_SELECTION: ModelSelection = { providerId: '', modelId: '' };

export function getModelsStore(): ModelsStoreState {
	return {
		...getAppModelSelections(),
		image: selection('image'),
		sound: selection('sound'),
		video: selection('video'),
		text: selection('text'),
		embedding: selection('embedding'),
	};
}

export function setModelsStore(value: ModelsStoreState): void {
	const { embedding, text, image, sound, video, ...appSelections } = value;
	const currentAppSelections = getAppModelSelections();
	setAppModelSelections({
		...appSelections,
		image: currentAppSelections.image,
		sound: currentAppSelections.sound,
		video: currentAppSelections.video,
	} as AppModelSelections);
	setSelection('text', text.providerId, text.modelId);
	setSelection('embedding', embedding.providerId, embedding.modelId);
	setSelection('image', image.providerId, image.modelId);
	setSelection('sound', sound.providerId, sound.modelId);
	setSelection('video', video.providerId, video.modelId);
}

export function getModelProviders(): StoredProvider[] {
	return getModelProvidersState().filter(isStoredProvider);
}

export function setModelProviders(providers: StoredProvider[]): void {
	setModelProvidersState(providers.filter(isStoredProvider));
}

export function getProviderId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(selection(kind).providerId);
}

export function setProviderId(kind: ModelKind, providerId: string): void {
	if (kind === 'text') {
		setAgentProviderId(providerId);
		return;
	}
	setSelection(kind, providerId, selection(kind).modelId);
}

export function getModelId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(selection(kind).modelId);
}

export function setModelId(kind: ModelKind, modelId: string): void {
	if (kind === 'text') {
		setAgentModelId(modelId);
		return;
	}
	setSelection(kind, selection(kind).providerId, modelId);
}

export function setSelection(kind: ModelKind, providerId: string, modelId: string): void {
	if (kind === 'text') {
		setAgentProviderId(providerId);
		setAgentModelId(modelId);
		return;
	}
	if (kind === 'embedding') {
		saveRagConfiguration({
			...getRagConfiguration(),
			embeddingProviderId: providerId,
			embeddingModelId: modelId,
		});
		return;
	}
	if (isMediaModelKind(kind)) {
		const mediaKind = agentMediaModelKind(kind);
		const current = getMediaModel(mediaKind);
		setMediaModel(mediaKind, {
			providerId,
			modelId,
			options:
				current.providerId === providerId && current.modelId === modelId ? current.options : {},
		});
		return;
	}
	setAppModelSelections({ ...getAppModelSelections(), [kind]: { providerId, modelId } });
}

export function getOptions(kind: MediaModelKind): Record<string, unknown> {
	return getMediaModel(agentMediaModelKind(kind)).options;
}

export function setOptions(kind: MediaModelKind, options: Record<string, unknown>): void {
	const mediaKind = agentMediaModelKind(kind);
	setMediaModel(mediaKind, { ...getMediaModel(mediaKind), options });
}

export function resolveOptions(
	kind: MediaModelKind,
	providerId: string,
	modelId: string,
	overrides?: Record<string, unknown>
): Record<string, unknown> | undefined {
	const configured = getMediaModel(agentMediaModelKind(kind));
	const defaults =
		configured.providerId === providerId && configured.modelId === modelId
			? configured.options
			: {};
	const resolved = { ...defaults, ...overrides };
	return Object.keys(resolved).length > 0 ? resolved : undefined;
}

function selection(kind: ModelKind): ModelSelection {
	if (kind === 'text') {
		return {
			providerId: getAgentProviderId() ?? '',
			modelId: getAgentModelId() ?? '',
		};
	}
	if (kind === 'embedding') {
		const configuration = getRagConfiguration();
		return {
			providerId: configuration.embeddingProviderId,
			modelId: configuration.embeddingModelId,
		};
	}
	if (isMediaModelKind(kind)) {
		const configured = getMediaModel(agentMediaModelKind(kind));
		if (configured.providerId || configured.modelId) {
			return { providerId: configured.providerId, modelId: configured.modelId };
		}
	}
	return getAppModelSelections()[kind] ?? EMPTY_SELECTION;
}

function isMediaModelKind(kind: ModelKind): kind is MediaModelKind {
	return kind === 'image' || kind === 'sound' || kind === 'video';
}

function agentMediaModelKind(kind: MediaModelKind): AgentMediaModelKind {
	return kind === 'sound' ? 'audio' : kind;
}

function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

function isStoredProvider(value: unknown): value is StoredProvider {
	if (typeof value !== 'object' || value === null) return false;
	const provider = value as Partial<StoredProvider>;
	return (
		typeof provider.id === 'string' &&
		typeof provider.name === 'string' &&
		typeof provider.apiKey === 'string' &&
		typeof provider.baseUrl === 'string'
	);
}
