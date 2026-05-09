import { getProvider as getCatalogProvider, isKnownProvider } from '../../shared/providers';
import { PROVIDERS } from '../../shared/types';
import type { ProviderEntry } from '../../shared/types';
import {
	DEFAULT_RAG_SERVICE,
	DEFAULT_SEARCH_SERVICE,
	DEFAULT_ASSISTANT_SERVICE,
	type AssistantService,
	type Provider,
	type ProviderKind,
	type ProviderRef,
	type RagService,
	type SearchService,
	type ServicesMap,
} from './types';

// ---------------------------------------------------------------------------
// Generic value helpers
// ---------------------------------------------------------------------------

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

const VALID_KINDS: readonly ProviderKind[] = [
	'llm',
	'search',
	'embeddings',
	'vector',
	'tts',
	'stt',
];

function normalizeKinds(value: unknown, fallback: ProviderKind[] = ['llm']): ProviderKind[] {
	if (!Array.isArray(value)) return [...fallback];
	const out: ProviderKind[] = [];
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const k = entry.trim().toLowerCase() as ProviderKind;
		if (VALID_KINDS.includes(k) && !out.includes(k)) out.push(k);
	}
	return out.length > 0 ? out : [...fallback];
}

function normalizeStringRecord(value: unknown): Record<string, string> | undefined {
	if (!isRecord(value)) return undefined;
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(value)) {
		if (typeof v === 'string') out[k] = v;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Provider (v2) normalization
// ---------------------------------------------------------------------------

export function defaultKindsForId(id: string): ProviderKind[] {
	if (id === 'openai') return ['llm', 'embeddings'];
	if (id === 'anthropic') return ['llm'];
	if (id === 'tavily' || id === 'brave' || id === 'serper') return ['search'];
	return ['llm'];
}

export function normalizeProvider(value: unknown): Provider | null {
	if (!isRecord(value)) return null;
	const id = trimmedString(value.id).toLowerCase();
	if (!id) return null;
	const apiKey = stringOrEmpty(value.apiKey);
	const now = Date.now();
	const createdAt = typeof value.createdAt === 'number' ? value.createdAt : now;
	const updatedAt = typeof value.updatedAt === 'number' ? value.updatedAt : now;
	const catalog = getCatalogProvider(id);
	return {
		id,
		name: nonEmptyTrimmed(value.name) ?? catalog?.name,
		kinds: normalizeKinds(value.kinds, defaultKindsForId(id)),
		apiKey,
		baseUrl: nonEmptyTrimmed(value.baseUrl),
		metadata: normalizeStringRecord(value.metadata),
		defaultModel: nonEmptyTrimmed(value.defaultModel),
		createdAt,
		updatedAt,
	};
}

export function normalizeProviderMap(value: unknown): Record<string, Provider> {
	const out: Record<string, Provider> = {};
	if (!isRecord(value)) return out;
	for (const [key, raw] of Object.entries(value)) {
		const provider = normalizeProvider({ ...(isRecord(raw) ? raw : {}), id: key });
		if (provider) out[provider.id] = provider;
	}
	return out;
}

export function cloneProvider(provider: Provider): Provider {
	return {
		id: provider.id,
		name: provider.name,
		kinds: [...provider.kinds],
		apiKey: provider.apiKey,
		baseUrl: provider.baseUrl,
		metadata: provider.metadata ? { ...provider.metadata } : undefined,
		defaultModel: provider.defaultModel,
		createdAt: provider.createdAt,
		updatedAt: provider.updatedAt,
	};
}

export function cloneProviderMap(map: Record<string, Provider>): Record<string, Provider> {
	const out: Record<string, Provider> = {};
	for (const [id, p] of Object.entries(map)) out[id] = cloneProvider(p);
	return out;
}

// ---------------------------------------------------------------------------
// ProviderRef
// ---------------------------------------------------------------------------

export function normalizeProviderRef(value: unknown): ProviderRef {
	if (!isRecord(value)) return { providerId: '' };
	const providerId = trimmedString(value.providerId).toLowerCase();
	const model = nonEmptyTrimmed(value.model);
	const params = isRecord(value.params)
		? ({ ...value.params } as Record<string, unknown>)
		: undefined;
	const ref: ProviderRef = { providerId };
	if (model !== undefined) ref.model = model;
	if (params) ref.params = params;
	return ref;
}

export function cloneProviderRef(ref: ProviderRef): ProviderRef {
	const out: ProviderRef = { providerId: ref.providerId };
	if (ref.model !== undefined) out.model = ref.model;
	if (ref.params) out.params = { ...ref.params };
	return out;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export function normalizeAssistantService(value: unknown): AssistantService {
	if (!isRecord(value)) return cloneAssistantService(DEFAULT_ASSISTANT_SERVICE);
	return {
		enabled: value.enabled === true,
		llm: normalizeProviderRef(value.llm),
	};
}

export function normalizeSearchService(value: unknown): SearchService {
	if (!isRecord(value)) return cloneSearchService(DEFAULT_SEARCH_SERVICE);
	const out: SearchService = {
		enabled: value.enabled === true,
		search: normalizeProviderRef(value.search),
	};
	if (isRecord(value.llm)) out.llm = normalizeProviderRef(value.llm);
	return out;
}

export function normalizeRagService(value: unknown): RagService {
	if (!isRecord(value)) return cloneRagService(DEFAULT_RAG_SERVICE);
	const out: RagService = {
		enabled: value.enabled === true,
		embeddings: normalizeProviderRef(value.embeddings),
		llm: normalizeProviderRef(value.llm),
	};
	if (Array.isArray(value.fallbackEmbeddings)) {
		out.fallbackEmbeddings = value.fallbackEmbeddings.map(normalizeProviderRef);
	}
	if (isRecord(value.vectorStore)) {
		const kind = trimmedString(value.vectorStore.kind);
		if (kind) {
			out.vectorStore = {
				kind,
				path: nonEmptyTrimmed(value.vectorStore.path),
				url: nonEmptyTrimmed(value.vectorStore.url),
			};
		}
	}
	return out;
}

export function normalizeServices(value: unknown): ServicesMap {
	const raw = isRecord(value) ? value : {};
	return {
		assistant: normalizeAssistantService(raw.assistant),
		search: normalizeSearchService(raw.search),
		rag: normalizeRagService(raw.rag),
	};
}

export function cloneAssistantService(s: AssistantService): AssistantService {
	return { enabled: s.enabled, llm: cloneProviderRef(s.llm) };
}

export function cloneSearchService(s: SearchService): SearchService {
	const out: SearchService = { enabled: s.enabled, search: cloneProviderRef(s.search) };
	if (s.llm) out.llm = cloneProviderRef(s.llm);
	return out;
}

export function cloneRagService(s: RagService): RagService {
	const out: RagService = {
		enabled: s.enabled,
		embeddings: cloneProviderRef(s.embeddings),
		llm: cloneProviderRef(s.llm),
	};
	if (s.fallbackEmbeddings) out.fallbackEmbeddings = s.fallbackEmbeddings.map(cloneProviderRef);
	if (s.vectorStore) out.vectorStore = { ...s.vectorStore };
	return out;
}

export function cloneServices(s: ServicesMap): ServicesMap {
	return {
		assistant: cloneAssistantService(s.assistant),
		search: cloneSearchService(s.search),
		rag: cloneRagService(s.rag),
	};
}

// ---------------------------------------------------------------------------
// Legacy helpers (used during v1 -> v2 migration AND by facade methods)
// ---------------------------------------------------------------------------

/** Build a `ProviderEntry` (legacy) from a v2 `Provider`. Only emits known catalog ids. */
export function providerToEntry(p: Provider): ProviderEntry | null {
	if (!isKnownProvider(p.id)) return null;
	const catalog = PROVIDERS.find((entry) => entry.id === p.id);
	if (!catalog) return null;
	return {
		id: catalog.id,
		name: catalog.name,
		apiKey: p.apiKey,
		model: p.defaultModel ?? '',
	};
}

export function providerMapToEntries(map: Record<string, Provider>): ProviderEntry[] {
	const out: ProviderEntry[] = [];
	for (const p of Object.values(map)) {
		const entry = providerToEntry(p);
		if (entry && entry.apiKey.trim().length > 0) out.push(entry);
	}
	return out;
}

/** Parse a `ProviderEntry`-shaped input from arbitrary value. Used by `addProvider` IPC. */
export function normalizeProviderInput(value: unknown): ProviderEntry | null {
	if (!isRecord(value)) return null;
	let id: string | undefined;
	const directId = nonEmptyTrimmed(value.id);
	if (directId) {
		id = directId;
	} else if (isRecord(value.provider)) {
		const providerId = trimmedString(value.provider.id);
		if (providerId) id = providerId;
	}
	if (!id) return null;
	const known = getCatalogProvider(id);
	if (!known) return null;
	const apiKey = stringOrEmpty(value.apiKey) || stringOrEmpty(value.apikey);
	const model = stringOrEmpty(value.model);
	return { id: known.id, name: known.name, apiKey, model };
}

export function normalizeProviderEntries(value: unknown): ProviderEntry[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<ProviderEntry['id']>();
	const out: ProviderEntry[] = [];
	for (const entry of value) {
		const provider = normalizeProviderInput(entry);
		if (!provider || seen.has(provider.id)) continue;
		seen.add(provider.id);
		out.push(provider);
	}
	return out;
}
