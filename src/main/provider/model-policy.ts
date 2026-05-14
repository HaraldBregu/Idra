import type { Model } from '../../shared/service';

const OPENAI_ASSISTANT_MODEL_ORDER = [
	'gpt-5.5',
	'gpt-5.4',
	'gpt-5.4-mini',
	'gpt-5.2',
	'gpt-5.1',
	'gpt-5',
] as const;

const OPENAI_ASSISTANT_MODEL_IDS = new Set<string>(OPENAI_ASSISTANT_MODEL_ORDER);

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function isAllowedAssistantModel(providerId: string, modelId: string): boolean {
	if (normalizeProviderId(providerId) !== 'openai') {
		return true;
	}
	return OPENAI_ASSISTANT_MODEL_IDS.has(modelId.trim());
}

export function filterSelectableAssistantModels(providerId: string, models: Model[]): Model[] {
	if (normalizeProviderId(providerId) !== 'openai') {
		return models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return OPENAI_ASSISTANT_MODEL_ORDER.flatMap((id) => {
		const model = byId.get(id);
		return model ? [model] : [];
	});
}
