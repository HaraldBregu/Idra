export const DEFAULT_MODEL_CONTEXT_TOKENS = 32_768;
export const MODEL_CONTEXT_SAFETY_TOKENS = 1_024;

export function modelInputLimit(maxOutputTokens: number): number {
	return DEFAULT_MODEL_CONTEXT_TOKENS - maxOutputTokens - MODEL_CONTEXT_SAFETY_TOKENS;
}
