export const MODEL_REASONING_EFFORTS = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
] as const;

export type ModelReasoningEffort = (typeof MODEL_REASONING_EFFORTS)[number];

export const DEFAULT_MODEL_REASONING_EFFORT: ModelReasoningEffort = 'medium';

const MODEL_REASONING_EFFORT_PROVIDER_ID = 'openai';

const GPT_5_4_MINI_REASONING_EFFORTS = MODEL_REASONING_EFFORTS.filter(
	(effort) => effort !== 'minimal'
);

export interface Model {
	id: string;
	name: string;
	effort?: ModelReasoningEffort;
}

export function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

export function supportsModelReasoningEffortProvider(providerId: string): boolean {
	return providerId.trim().toLowerCase() === MODEL_REASONING_EFFORT_PROVIDER_ID;
}

export function getModelReasoningEfforts(
	modelId: string,
	providerId?: string
): readonly ModelReasoningEffort[] {
	if (providerId !== undefined && !supportsModelReasoningEffortProvider(providerId)) return [];
	const normalizedModelId = modelId.trim().toLowerCase();
	if (normalizedModelId === 'gpt-5.4-mini') return GPT_5_4_MINI_REASONING_EFFORTS;
	return MODEL_REASONING_EFFORTS;
}

export function getDefaultModelReasoningEffort(
	modelId: string,
	providerId?: string
): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId, providerId);
	return supportedEfforts.includes(DEFAULT_MODEL_REASONING_EFFORT)
		? DEFAULT_MODEL_REASONING_EFFORT
		: (supportedEfforts[0] ?? DEFAULT_MODEL_REASONING_EFFORT);
}

export function isModelReasoningEffortSupported(
	modelId: string,
	effort: unknown,
	providerId?: string
): effort is ModelReasoningEffort {
	return (
		isModelReasoningEffort(effort) && getModelReasoningEfforts(modelId, providerId).includes(effort)
	);
}

export function requireModelReasoningEffort(
	modelId: string,
	effort: unknown,
	providerId?: string
): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId, providerId);
	if (supportedEfforts.length === 0) {
		throw new Error(`Reasoning effort is not supported for provider "${providerId ?? ''}".`);
	}
	if (effort === undefined || effort === null || effort === '') {
		return getDefaultModelReasoningEffort(modelId, providerId);
	}
	if (isModelReasoningEffortSupported(modelId, effort, providerId)) return effort;
	throw new Error(
		`Reasoning effort "${String(effort)}" is not supported for model "${modelId}". Supported values are: ${supportedEfforts.join(', ')}.`
	);
}
