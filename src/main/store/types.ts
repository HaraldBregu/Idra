import type { Provider as SharedProvider } from '../../shared/types';

// ---------------------------------------------------------------------------
// Provider registry (v2 schema)
// ---------------------------------------------------------------------------
// One entry per provider id. Stores the credential plus capability hints.
// Services reference a provider by id via `ProviderRef`.

export type ProviderKind = 'llm' | 'search' | 'embeddings' | 'vector' | 'tts' | 'stt';

export interface Provider {
	id: string;
	name?: string;
	kinds: ProviderKind[];
	apiKey: string;
	baseUrl?: string;
	metadata?: Record<string, string>;
	defaultModel?: string;
	createdAt: number;
	updatedAt: number;
}

export interface ProviderRef {
	providerId: string;
	model?: string;
	params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Services (consumers of providers)
// ---------------------------------------------------------------------------

export interface AssistantService {
	enabled: boolean;
	llm: ProviderRef;
}

export interface SearchService {
	enabled: boolean;
	search: ProviderRef;
	llm?: ProviderRef;
}

export interface RagService {
	enabled: boolean;
	embeddings: ProviderRef;
	llm: ProviderRef;
	fallbackEmbeddings?: ProviderRef[];
	vectorStore?: { kind: string; path?: string; url?: string };
}

export interface ServicesMap {
	assistant: AssistantService;
	search: SearchService;
	rag: RagService;
}

// ---------------------------------------------------------------------------
// Legacy (pre-v2) — preserved during migration only
// ---------------------------------------------------------------------------


export interface StoreSchema {
	providers: SharedProvider[];
}

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
