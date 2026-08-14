import type { ExtensionStoreValue } from '../../shared/extension_store_types';

export function isExtensionStoreValue(value: unknown): value is ExtensionStoreValue {
	const seen = new Set<object>();
	const visit = (input: unknown): boolean => {
		if (input === null || typeof input === 'string' || typeof input === 'boolean') return true;
		if (typeof input === 'number') return Number.isFinite(input);
		if (typeof input !== 'object') return false;
		if (seen.has(input)) return false;
		seen.add(input);

		let valid: boolean;
		if (Array.isArray(input)) {
			valid =
				Object.keys(input).length === input.length &&
				Object.getOwnPropertySymbols(input).length === 0 &&
				input.every(visit);
		} else {
			const prototype = Object.getPrototypeOf(input);
			valid =
				(prototype === Object.prototype || prototype === null) &&
				Object.getOwnPropertySymbols(input).length === 0 &&
				Object.values(input as Record<string, unknown>).every(visit);
		}
		seen.delete(input);
		return valid;
	};

	return visit(value);
}
