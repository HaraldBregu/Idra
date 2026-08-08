import { findModel } from '../../models';

export function modelOutputLimit(
	providerId: string,
	modelId: string,
	options: Record<string, unknown>
): number {
	const configured = [options.max_output_tokens, options.max_tokens, options.maxTokens].find(
		(value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
	);
	const inputs = findModel(providerId, 'llm', modelId)?.metadata?.inputs;
	const contract = inputs?.max_output_tokens ?? inputs?.max_tokens;
	const catalogLimit = contract?.maximum ?? contract?.default;
	const selected = configured ?? (typeof catalogLimit === 'number' ? catalogLimit : 8192);
	return Math.max(1, Math.min(Math.floor(selected), 65_536));
}
