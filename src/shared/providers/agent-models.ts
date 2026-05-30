import { DEFAULT_PROVIDERS } from './definitions';
import { CHAT_MODELS_BY_PROVIDER } from './llm-models';
import { normalizeProviderId, type ModelCatalog, type ProviderModel } from './models';

export const DEFAULT_AGENT_MODELS_BY_PROVIDER: ModelCatalog = CHAT_MODELS_BY_PROVIDER;

function isDefaultProvider(providerId: string): boolean {
	const normalizedProviderId = normalizeProviderId(providerId);
	return DEFAULT_PROVIDERS.some(
		(provider) => normalizeProviderId(provider.id) === normalizedProviderId
	);
}

function defaultModelsForProvider(providerId: string): readonly ProviderModel[] | undefined {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)];
}

export function getDefaultAgentModels(providerId: string): ProviderModel[] {
	return (DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] ?? []).map((model) => ({
		...model,
	}));
}

export function hasDefaultAgentModels(providerId: string): boolean {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] !== undefined;
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	const defaultModels = defaultModelsForProvider(providerId);

	if (defaultModels) {
		return defaultModels.some((model) => model.id === normalizedModelId);
	}

	return !isDefaultProvider(providerId);
}

export function filterSelectableAgentModels(
	providerId: string,
	models: ProviderModel[]
): ProviderModel[] {
	const defaultModels = defaultModelsForProvider(providerId);
	if (!defaultModels) {
		return isDefaultProvider(providerId) ? [] : models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return defaultModels.flatMap((defaultModel) => {
		const model = byId.get(defaultModel.id);
		return model ? [model] : [];
	});
}
