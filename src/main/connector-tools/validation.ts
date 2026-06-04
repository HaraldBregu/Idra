import type { ConnectorCallToolOptions } from '../../shared/connector';

export function readToolArgs(value: unknown): Record<string, unknown> {
	if (value === undefined || value === null) return {};
	if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	throw new Error('Connector tool arguments must be an object.');
}

export function readToolOptions(value: unknown): ConnectorCallToolOptions | undefined {
	if (value === undefined || value === null) return undefined;
	const options = requireObject(value, 'Connector tool options');
	for (const key of ['timeoutMs', 'retries'] as const) {
		const item = options[key];
		if (item !== undefined && (!Number.isInteger(item) || typeof item !== 'number' || item < 0)) {
			throw new Error(`Connector tool option ${key} must be a non-negative integer.`);
		}
	}
	return options;
}

export function requireString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${label} is required.`);
	return trimmed;
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}
