export const DEFAULT_MODEL_OUTPUT_TOKENS = 8_192;

export function modelOutputLimit(options: Record<string, unknown>): number {
	const configured = [options.max_output_tokens, options.max_tokens, options.maxTokens].find(
		(value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
	);
	return Math.max(1, Math.min(Math.floor(configured ?? DEFAULT_MODEL_OUTPUT_TOKENS), 65_536));
}
