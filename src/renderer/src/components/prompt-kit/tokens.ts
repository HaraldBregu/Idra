export function estimateTokens(chars: number): number {
	return chars > 0 ? Math.max(1, Math.round(chars / 4)) : 0;
}
