import type {
	AssistantAiSettings,
	Channel,
	UserProfile,
} from '../../shared/types';

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

export interface AssistantConfiguration {
	apikey: string;
	model: string;
}

export interface LegacyBlob {
	assistantAi?: unknown;
	assistantConfiguration?: unknown;
	providers?: unknown;
}

// ---------------------------------------------------------------------------
// Top-level store schema (v2)
// ---------------------------------------------------------------------------

export const STORE_SCHEMA_VERSION = 1;

export interface StoreSchema {
	schemaVersion: number;
	providers: Record<string, Provider>;
	services: ServicesMap;
	channel: Channel | null;
	profile: UserProfile | null;
	_legacy?: LegacyBlob;
	// --- legacy keys retained in type only so untyped reads in the migrator
	//     stay narrow. Migration deletes them on first run.
	assistantAi?: AssistantAiSettings;
	assistantConfiguration?: AssistantConfiguration;
}

export const DEFAULT_ASSISTANT_SERVICE: AssistantService = {
	enabled: false,
	llm: { providerId: '', model: '' },
};

export const DEFAULT_SEARCH_SERVICE: SearchService = {
	enabled: false,
	search: { providerId: '' },
};

export const DEFAULT_RAG_SERVICE: RagService = {
	enabled: false,
	embeddings: { providerId: '', model: '' },
	llm: { providerId: '', model: '' },
};

export const DEFAULT_SERVICES: ServicesMap = {
	assistant: DEFAULT_ASSISTANT_SERVICE,
	search: DEFAULT_SEARCH_SERVICE,
	rag: DEFAULT_RAG_SERVICE,
};

export const DEFAULTS: StoreSchema = {
	schemaVersion: STORE_SCHEMA_VERSION,
	providers: {},
	services: DEFAULT_SERVICES,
	channel: null,
	profile: null,
};

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
