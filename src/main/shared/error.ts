export function toError(value: unknown, fallback: string): Error {
	return value instanceof Error ? value : new Error(value === undefined ? fallback : String(value));
}
