import { type PublicProvider } from '../../../../../../../shared/providers';
import {
	getDefaultModelReasoningEffort,
	isModelReasoningEffortSupported,
	type ConfiguredModelOperator,
	type Model,
	type ModelReasoningEffort,
} from '../../../../../../../shared/agents/service';

export function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) return error.message;
	return fallback;
}

export function effortForModel(
	modelId: string,
	value: unknown,
	providerId?: string
): ModelReasoningEffort {
	return isModelReasoningEffortSupported(modelId, value, providerId)
		? value
		: getDefaultModelReasoningEffort(modelId, providerId);
}

export function storedEffortForComparison(
	model: Model,
	providerId: string
): ModelReasoningEffort | undefined {
	if (model.effort === undefined) return getDefaultModelReasoningEffort(model.id, providerId);
	return isModelReasoningEffortSupported(model.id, model.effort, providerId)
		? model.effort
		: undefined;
}

export function mergeProviders(
	providers: readonly PublicProvider[],
	operator: ConfiguredModelOperator | undefined
): PublicProvider[] {
	const byId = new Map(providers.map((p) => [p.id, p]));
	if (operator && !byId.has(operator.provider.id)) byId.set(operator.provider.id, operator.provider);
	return [...byId.values()];
}
