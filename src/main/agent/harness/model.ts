import type { Usage } from '../../provider/types';
import type {
	AgentHarnessModelCandidate,
	AgentHarnessModelCost,
	AgentHarnessModelDescriptor,
	AgentHarnessModelRegistry,
} from './types';

export class StaticAgentHarnessModelRegistry implements AgentHarnessModelRegistry {
	private readonly models = new Map<string, AgentHarnessModelDescriptor>();

	constructor(models: AgentHarnessModelDescriptor[] = []) {
		for (const model of models) {
			this.register(model);
		}
	}

	register(model: AgentHarnessModelDescriptor): void {
		this.models.set(modelKey(model.provider, model.model), { ...model });
	}

	get(provider: string | undefined, model: string): AgentHarnessModelDescriptor | undefined {
		const direct = this.models.get(modelKey(provider, model));
		if (direct) return { ...direct };
		for (const descriptor of this.models.values()) {
			if (descriptor.model === model) return { ...descriptor };
		}
		return undefined;
	}

	list(): AgentHarnessModelDescriptor[] {
		return [...this.models.values()].map((model) => ({ ...model }));
	}
}

export function estimateTokenCount(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateUsageCost(usage: Usage, cost: AgentHarnessModelCost | undefined): number {
	if (!cost) return 0;
	const input = ((cost.inputUsdPerMillionTokens ?? 0) * usage.inputTokens) / 1_000_000;
	const output = ((cost.outputUsdPerMillionTokens ?? 0) * usage.outputTokens) / 1_000_000;
	return roundCurrency(input + output);
}

export function describeModelCandidate(
	candidate: AgentHarnessModelCandidate,
	registry: AgentHarnessModelRegistry | undefined
): AgentHarnessModelDescriptor | undefined {
	return registry?.get(candidate.provider, candidate.modelId);
}

function roundCurrency(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000;
}

function modelKey(provider: string | undefined, model: string): string {
	return `${provider?.trim().toLowerCase() ?? ''}:${model.trim()}`;
}
