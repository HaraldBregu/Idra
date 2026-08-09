import type { ExtensionStoreValue } from '../../shared/extension_store_types';

export function isExtensionStoreValue(value: unknown): value is ExtensionStoreValue {
	const seen = new Set<object>();
	const visit = (input: unknown): boolean => {
		if (input === null || typeof input === 'string' || typeof input === 'boolean') return true;
		if (typeof input === 'number') return Number.isFinite(input);
		if (typeof input !== 'object') return false;
		if (seen.has(input)) return false;
		seen.add(input);

		if (Array.isArray(input)) return input.every(visit);
		const prototype = Object.getPrototypeOf(input);
		if (prototype !== Object.prototype && prototype !== null) return false;
		return Object.values(input as Record<string, unknown>).every(visit);
	};

	return visit(value);
}
