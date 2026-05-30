import type { Usage } from '../../provider/types';
import type { AgentHarnessModelCost } from './types';

export function estimateTokenCount(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateUsageCost(usage: Usage, cost: AgentHarnessModelCost | undefined): number {
	if (!cost) return 0;
	const input = ((cost.inputUsdPerMillionTokens ?? 0) * usage.inputTokens) / 1_000_000;
	const output = ((cost.outputUsdPerMillionTokens ?? 0) * usage.outputTokens) / 1_000_000;
	return roundCurrency(input + output);
}

function roundCurrency(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000;
}
