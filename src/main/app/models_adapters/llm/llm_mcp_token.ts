export function llmAuthorizationToken(value: string | undefined): string | undefined {
	const token = value?.trim();
	if (!token) return undefined;
	return token.replace(/^Bearer\s+/i, '');
}
