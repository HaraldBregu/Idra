import type { Model } from '../../shared/service';

const OPENAI_AGENT_MODEL_ORDER = [
	'gpt-5.5',
	'gpt-5.4',
	'gpt-5.4-mini',
] as const;

const OPENAI_AGENT_MODEL_IDS = new Set<string>(OPENAI_AGENT_MODEL_ORDER);

const ANTHROPIC_AGENT_MODEL_ORDER = ['claude-opus-4-7', 'claude-sonnet-4-6'] as const;

const ANTHROPIC_AGENT_MODEL_IDS = new Set<string>(ANTHROPIC_AGENT_MODEL_ORDER);

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedProviderId = normalizeProviderId(providerId);
	const normalizedModelId = modelId.trim();

	if (normalizedProviderId === 'openai') {
		return OPENAI_AGENT_MODEL_IDS.has(normalizedModelId);
	}

	if (normalizedProviderId === 'anthropic') {
		return ANTHROPIC_AGENT_MODEL_IDS.has(normalizedModelId);
	}

	return true;
}

export function filterSelectableAgentModels(providerId: string, models: Model[]): Model[] {
	const normalizedProviderId = normalizeProviderId(providerId);

	if (normalizedProviderId === 'openai') {
		const byId = new Map(models.map((model) => [model.id.trim(), model]));
		return OPENAI_AGENT_MODEL_ORDER.flatMap((id) => {
			const model = byId.get(id);
			return model ? [model] : [];
		});
	}

	if (normalizedProviderId === 'anthropic') {
		const byId = new Map(models.map((model) => [model.id.trim(), model]));
		return ANTHROPIC_AGENT_MODEL_ORDER.flatMap((id) => {
			const model = byId.get(id);
			return model ? [model] : [];
		});
	}

	return models;
}
