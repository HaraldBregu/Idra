export function normalizeUsername(value: string): string | undefined {
	const username = value.trim().toLowerCase();
	return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(username) ? username : undefined;
}
