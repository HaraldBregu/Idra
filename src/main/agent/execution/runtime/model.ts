import type { Usage } from '../../../provider/types';

export function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}

export function estimateUsageCost(usage: Usage, cost?: { inputUsdPerMillionTokens?: number; outputUsdPerMillionTokens?: number }): number {
	return ((usage.inputTokens * (cost?.inputUsdPerMillionTokens ?? 0)) + (usage.outputTokens * (cost?.outputUsdPerMillionTokens ?? 0))) / 1_000_000;
}
