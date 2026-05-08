import { getProvider } from '../../shared/providers';
import type { Provider, ProviderEntry, ProviderId } from '../../shared/types';

const DEFAULT_PROVIDER: Provider = {
	openai: { apikey: '', model: '' },
	anthropic: { apikey: '', model: '' },
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function trimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function nonEmptyTrimmed(value: unknown): string | undefined {
	const trimmed = trimmedString(value);
	return trimmed.length > 0 ? trimmed : undefined;
}

export function stringOrEmpty(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

/**
 * Parse a provider entry from arbitrary input. Accepts both the flat shape
 * `{ id, name, apiKey, model }` and the legacy `{ provider: { id, name }, apiKey }`
 * shape so existing settings files migrate cleanly.
 */
export function normalizeProviderInput(value: unknown): ProviderEntry | null {
	if (!isRecord(value)) return null;

	let id: string | undefined;
	const directId = nonEmptyTrimmed(value.id);
	if (directId) {
		id = directId;
	} else if (isRecord(value.provider)) {
		const providerId = trimmedString(value.provider.id);
		if (providerId) {
			id = providerId;
		}
	}

	if (!id) return null;

	const known = getProvider(id);
	if (!known) return null;
	const apiKey = stringOrEmpty(value.apiKey) || stringOrEmpty(value.apikey);
	const model = stringOrEmpty(value.model);

	return { id: known.id, name: known.name, apiKey, model };
}

export function normalizeProviderEntries(value: unknown): ProviderEntry[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<ProviderId>();
	const out: ProviderEntry[] = [];
	for (const entry of value) {
		const provider = normalizeProviderInput(entry);
		if (!provider || seen.has(provider.id)) continue;
		seen.add(provider.id);
		out.push(provider);
	}
	return out;
}

export function normalizeProvider(value: unknown): Provider {
	const next = cloneProvider(DEFAULT_PROVIDER);

	if (Array.isArray(value)) {
		for (const entry of normalizeProviderEntries(value)) {
			next[entry.id] = { apikey: entry.apiKey, model: entry.model };
		}
		return next;
	}

	if (!isRecord(value)) return next;

	for (const id of ['openai', 'anthropic'] as const) {
		const raw = value[id];
		if (!isRecord(raw)) continue;
		next[id] = {
			apikey: stringOrEmpty(raw.apikey) || stringOrEmpty(raw.apiKey),
			model: stringOrEmpty(raw.model),
		};
	}

	return next;
}

export function providerToEntries(provider: Provider): ProviderEntry[] {
	const out: ProviderEntry[] = [];
	for (const id of ['openai', 'anthropic'] as const) {
		const catalog = getProvider(id);
		const config = provider[id];
		if (!catalog || !config.apikey.trim()) continue;
		out.push({
			id,
			name: catalog.name,
			apiKey: config.apikey,
			model: config.model,
		});
	}
	return out;
}

export function cloneProvider(provider: Provider): Provider {
	return {
		openai: { ...provider.openai },
		anthropic: { ...provider.anthropic },
	};
}

export function cloneProviderEntry(provider: ProviderEntry): ProviderEntry {
	return {
		id: provider.id,
		name: provider.name,
		apiKey: provider.apiKey,
		model: provider.model,
	};
}
