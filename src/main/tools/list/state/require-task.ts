export function requireTask(value: unknown): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error('todo task is required.');
	return value.trim();
}
