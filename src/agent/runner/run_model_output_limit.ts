import { findModel } from '../models/catalog';

export const DEFAULT_MODEL_OUTPUT_TOKENS = 8_192;

export function modelOutputLimit(
	providerId: string,
	modelId: string,
	options: Record<string, unknown>
): number {
	const configured = [options.max_output_tokens, options.max_tokens, options.maxTokens].find(
		(value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
	);
	const metadata = findModel(providerId, 'llm', modelId)?.metadata;
	const inputs = metadata?.inputs;
	const contract = inputs?.max_output_tokens ?? inputs?.max_tokens;
	const maximum = contract?.maximum;
	const catalogDefault = metadata?.defaultOutputTokens ?? contract?.default;
	const fallback =
		typeof maximum === 'number'
			? Math.min(maximum, DEFAULT_MODEL_OUTPUT_TOKENS)
			: DEFAULT_MODEL_OUTPUT_TOKENS;
	const selected = configured ?? (typeof catalogDefault === 'number' ? catalogDefault : fallback);
	const bounded = typeof maximum === 'number' ? Math.min(selected, maximum) : selected;
	return Math.max(1, Math.min(Math.floor(bounded), 65_536));
}
