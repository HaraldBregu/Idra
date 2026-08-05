import type { StoredProvider } from '../../shared/provider_types';
import { getAppModelSelections, setAppModelSelections, type ModelKind, type ModelSelection, type ModelsStoreState } from '../app/settings_store';
import { getModelProvidersState, setModelProvidersState } from '../providers/providers_index';

export type { ModelKind, ModelSelection, ModelsStoreState } from '../app/settings_store';

const EMPTY_SELECTION: ModelSelection = { providerId: '', modelId: '' };

export function getModelsStore(): ModelsStoreState {
	return getAppModelSelections();
}

export function setModelsStore(value: ModelsStoreState): void {
	setAppModelSelections(value);
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
	setSelection(kind, providerId, selection(kind).modelId);
}

export function getModelId(kind: ModelKind): string | undefined {
	return optionalTrimmedString(selection(kind).modelId);
}

export function setModelId(kind: ModelKind, modelId: string): void {
	setSelection(kind, selection(kind).providerId, modelId);
}

export function setSelection(kind: ModelKind, providerId: string, modelId: string): void {
	setAppModelSelections({ ...getAppModelSelections(), [kind]: { providerId, modelId } });
}

function selection(kind: ModelKind): ModelSelection {
	return getAppModelSelections()[kind] ?? EMPTY_SELECTION;
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
