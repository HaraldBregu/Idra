import type { StoreService } from '../../store';
import { makeProvider, type ProviderSpec } from '../../provider/factory';
import type { ProviderAdapter } from '../../provider/types';
import type { ModelReasoningEffort } from '../../../shared/agents/service';
import { requireModelReasoningEffort } from '../../../shared/agents/service';

export interface AgentModelSelectionInput {
	providerId?: string;
	model?: string;
	effort?: ModelReasoningEffort;
}

export interface AgentModelSelection {
	providerId: string;
	modelId: string;
	effort?: ModelReasoningEffort;
	adapter: ProviderAdapter;
}

export interface AgentModelSelectionDependencies {
	store: Pick<StoreService, 'getAgentService' | 'getProviderById'>;
	providerFactory?: (provider: ProviderSpec) => ProviderAdapter;
}

export function resolveAgentModelSelection(
	input: AgentModelSelectionInput,
	dependencies: AgentModelSelectionDependencies
): AgentModelSelection {
	const configured = dependencies.store.getAgentService?.();
	const providerId = (input.providerId ?? configured?.provider.id ?? 'openai').trim().toLowerCase();
	const modelId = (input.model ?? configured?.model.id ?? configured?.model.name ?? 'gpt-5.4-mini').trim();
	const effort = input.effort ?? configured?.model.effort;
	const resolvedEffort = effort ? requireModelReasoningEffort(modelId, effort, providerId) : undefined;
	const provider = dependencies.store.getProviderById(providerId) ?? { id: providerId, apiKey: '', baseUrl: undefined };
	const providerFactory = dependencies.providerFactory ?? makeProvider;
	return {
		providerId,
		modelId,
		effort: resolvedEffort,
		adapter: providerFactory({ id: provider.id, apiKey: provider.apiKey, baseURL: provider.baseUrl }),
	};
}
