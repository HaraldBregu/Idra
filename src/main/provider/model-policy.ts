import { DEFAULT_AGENT_MODELS_BY_PROVIDER } from '../../shared/provider-models';
import type { Model } from '../../shared/service';

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

function defaultModelsForProvider(providerId: string): readonly Model[] | undefined {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)];
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	const defaultModels = defaultModelsForProvider(providerId);

	if (defaultModels) {
		return defaultModels.some((model) => model.id === normalizedModelId);
	}

	return true;
}

export function filterSelectableAgentModels(providerId: string, models: Model[]): Model[] {
	const defaultModels = defaultModelsForProvider(providerId);
	if (!defaultModels) {
		return models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return defaultModels.flatMap((defaultModel) => {
		const model = byId.get(defaultModel.id);
		return model ? [model] : [];
	});
}
