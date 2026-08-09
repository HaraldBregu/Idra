export function optionalTrimmedString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

export function optionalStringList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value.map(optionalTrimmedString).filter((item): item is string => Boolean(item));
}
