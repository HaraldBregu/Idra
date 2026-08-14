export function toError(value: unknown, fallbackMessage = 'IPC handler failed.'): Error {
	if (value instanceof Error) return value;
	if (value === undefined || value === null) return new Error(fallbackMessage);
	if (typeof value === 'string') return new Error(value || fallbackMessage);

	try {
		const message = JSON.stringify(value);
		return new Error(message && message !== '{}' ? message : fallbackMessage);
	} catch {
		return new Error(String(value) || fallbackMessage);
	}
}
