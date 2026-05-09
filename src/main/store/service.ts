import Store from 'electron-store';
import type {
	AssistantAiProvider,
	AssistantAiSelection,
	AssistantAiSettings,
	Channel,
	ChannelType,
	DiscordChannelProperties,
	Provider as LegacyProvider,
	ProviderConfig,
	ProviderEntry,
	TelegramChannelProperties,
	UserProfile,
	WhatsappChannelProperties,
} from '../../shared/types';
import { PROVIDERS } from '../../shared/types';
import type { AppStartupInfo } from '../../shared/types';
import {
	DEFAULTS,
	DEFAULT_ASSISTANT_SERVICE,
	DEFAULT_RAG_SERVICE,
	DEFAULT_SEARCH_SERVICE,
	DEFAULT_SERVICES,
	STORE_SCHEMA_VERSION,
	type AssistantConfiguration,
	type AssistantService,
	type Provider,
	type ProviderKind,
	type ProviderRef,
	type RagService,
	type SearchService,
	type ServicesMap,
	type SettingsStore,
	type StoreSchema,
} from './types';
import {
	cloneAssistantService,
	cloneProvider,
	cloneProviderMap,
	cloneProviderRef,
	cloneRagService,
	cloneSearchService,
	cloneServices,
	defaultKindsForId,
	isRecord,
	normalizeProviderEntries,
	normalizeProviderInput,
	normalizeProviderMap,
	normalizeProviderRef,
	normalizeServices,
	providerMapToEntries,
	providerToEntry,
	stringOrEmpty,
	trimmedString,
} from './utils';

const DEFAULT_ASSISTANT_AI_PROVIDER = 'openai';
const DEFAULT_ASSISTANT_AI_MODEL = 'gpt-4o-mini';

const DEFAULT_TELEGRAM_CHANNEL: TelegramChannelProperties = { token: '', allowFrom: [] };
const DEFAULT_WHATSAPP_CHANNEL: WhatsappChannelProperties = { phoneNumber: '', token: '' };
const DEFAULT_DISCORD_CHANNEL: DiscordChannelProperties = { token: '', allowFrom: [] };

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			defaults: DEFAULTS,
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;
		this.migrateV1ToV2();
		this.ensureV2Defaults();
	}

	// =========================================================================
	// v2 API — provider registry
	// =========================================================================

	listProviders(): Provider[] {
		const map = this.store.get('providers');
		return Object.values(map ?? {}).map(cloneProvider);
	}

	findProvider(id: string): Provider | undefined {
		const normalized = id.trim().toLowerCase();
		if (!normalized) return undefined;
		const map = this.store.get('providers');
		const found = map?.[normalized];
		return found ? cloneProvider(found) : undefined;
	}

	providersByKind(kind: ProviderKind): Provider[] {
		return this.listProviders().filter((p) => p.kinds.includes(kind));
	}

	upsertProvider(
		input: Omit<Provider, 'createdAt' | 'updatedAt'> & {
			createdAt?: number;
			updatedAt?: number;
		}
	): Provider {
		const id = input.id.trim().toLowerCase();
		if (!id) throw new Error('Provider id required');

		const map = { ...(this.store.get('providers') ?? {}) };
		const existing = map[id];
		const now = Date.now();
		const next: Provider = {
			id,
			name: input.name ?? existing?.name,
			kinds: input.kinds.length > 0 ? [...input.kinds] : (existing?.kinds ?? defaultKindsForId(id)),
			apiKey: input.apiKey,
			baseUrl: input.baseUrl ?? existing?.baseUrl,
			metadata: input.metadata
				? { ...input.metadata }
				: existing?.metadata
					? { ...existing.metadata }
					: undefined,
			defaultModel: input.defaultModel ?? existing?.defaultModel,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		};
		map[id] = next;
		this.store.set('providers', map);
		return cloneProvider(next);
	}

	removeProvider(id: string): void {
		const normalized = id.trim().toLowerCase();
		if (!normalized) return;
		const map = { ...(this.store.get('providers') ?? {}) };
		if (!(normalized in map)) return;
		delete map[normalized];
		this.store.set('providers', map);

		// If any service referenced this provider, clear the ref so we don't
		// dangle. Keep the service entry so the user can re-target it.
		const services = cloneServices(this.store.get('services') ?? DEFAULT_SERVICES);
		let mutated = false;
		const clearIfMatch = (ref: ProviderRef): ProviderRef => {
			if (ref.providerId === normalized) {
				mutated = true;
				return { providerId: '' };
			}
			return ref;
		};
		services.assistant.llm = clearIfMatch(services.assistant.llm);
		services.search.search = clearIfMatch(services.search.search);
		if (services.search.llm) services.search.llm = clearIfMatch(services.search.llm);
		services.rag.embeddings = clearIfMatch(services.rag.embeddings);
		services.rag.llm = clearIfMatch(services.rag.llm);
		if (services.rag.fallbackEmbeddings) {
			services.rag.fallbackEmbeddings = services.rag.fallbackEmbeddings.filter(
				(ref) => ref.providerId !== normalized
			);
		}
		if (mutated) this.store.set('services', services);
	}

	// =========================================================================
	// v2 API — services
	// =========================================================================

	getAssistantService(): AssistantService {
		const services = this.store.get('services') ?? DEFAULT_SERVICES;
		return cloneAssistantService(services.assistant);
	}

	setAssistantService(patch: Partial<AssistantService>): AssistantService {
		const services = cloneServices(this.store.get('services') ?? DEFAULT_SERVICES);
		const next: AssistantService = {
			enabled: patch.enabled ?? services.assistant.enabled,
			llm: patch.llm
				? normalizeProviderRef(patch.llm)
				: cloneProviderRef(services.assistant.llm),
		};
		services.assistant = next;
		this.store.set('services', services);
		return cloneAssistantService(next);
	}

	getSearchService(): SearchService {
		const services = this.store.get('services') ?? DEFAULT_SERVICES;
		return cloneSearchService(services.search);
	}

	setSearchService(patch: Partial<SearchService>): SearchService {
		const services = cloneServices(this.store.get('services') ?? DEFAULT_SERVICES);
		const current = services.search;
		const next: SearchService = {
			enabled: patch.enabled ?? current.enabled,
			search: patch.search ? normalizeProviderRef(patch.search) : cloneProviderRef(current.search),
		};
		const llmPatch = 'llm' in patch ? patch.llm : current.llm;
		if (llmPatch) next.llm = normalizeProviderRef(llmPatch);
		services.search = next;
		this.store.set('services', services);
		return cloneSearchService(next);
	}

	getRagService(): RagService {
		const services = this.store.get('services') ?? DEFAULT_SERVICES;
		return cloneRagService(services.rag);
	}

	setRagService(patch: Partial<RagService>): RagService {
		const services = cloneServices(this.store.get('services') ?? DEFAULT_SERVICES);
		const current = services.rag;
		const next: RagService = {
			enabled: patch.enabled ?? current.enabled,
			embeddings: patch.embeddings
				? normalizeProviderRef(patch.embeddings)
				: cloneProviderRef(current.embeddings),
			llm: patch.llm ? normalizeProviderRef(patch.llm) : cloneProviderRef(current.llm),
		};
		const fallback =
			'fallbackEmbeddings' in patch ? patch.fallbackEmbeddings : current.fallbackEmbeddings;
		if (fallback) next.fallbackEmbeddings = fallback.map(normalizeProviderRef);
		const vectorStore = 'vectorStore' in patch ? patch.vectorStore : current.vectorStore;
		if (vectorStore) next.vectorStore = { ...vectorStore };
		services.rag = next;
		this.store.set('services', services);
		return cloneRagService(next);
	}

	/** Resolve a provider ref to the live provider entry + selected model. */
	resolveProviderRef(
		ref: ProviderRef
	): { provider: Provider; model: string | undefined } | null {
		const provider = this.findProvider(ref.providerId);
		if (!provider) return null;
		const model = ref.model && ref.model.length > 0 ? ref.model : provider.defaultModel;
		return { provider, model };
	}

	// =========================================================================
	// Legacy facades — preserve old IPC/tool/renderer contracts
	// =========================================================================

	// ---- AssistantAiSettings (selected provider + model + key list) ---------

	getAssistantAiSettings(): AssistantAiSettings {
		const map = this.store.get('providers') ?? {};
		const services = this.store.get('services') ?? DEFAULT_SERVICES;
		const providers: AssistantAiProvider[] = Object.values(map)
			.filter((p) => PROVIDERS.some((c) => c.id === p.id) && p.apiKey.trim().length > 0)
			.map((p) => ({ id: p.id, apiKey: p.apiKey }));
		const selectedProvider = PROVIDERS.some((p) => p.id === services.assistant.llm.providerId)
			? services.assistant.llm.providerId
			: DEFAULT_ASSISTANT_AI_PROVIDER;
		const selectedModel =
			services.assistant.llm.model && services.assistant.llm.model.trim().length > 0
				? services.assistant.llm.model
				: DEFAULT_ASSISTANT_AI_MODEL;
		return { providers, selectedProvider, selectedModel };
	}

	setAssistantAiProviderApiKey(providerId: string, apiKey: string): AssistantAiSettings {
		const id = providerId.trim().toLowerCase();
		if (!PROVIDERS.some((provider) => provider.id === id)) {
			throw new Error('Invalid provider');
		}
		const trimmedApiKey = apiKey.trim();
		if (trimmedApiKey.length > 0) {
			this.upsertProvider({
				id,
				apiKey: trimmedApiKey,
				kinds: defaultKindsForId(id),
			});
		} else {
			// Removing the apiKey: if the provider exists, clear apiKey but keep the entry
			// so defaultModel etc. are preserved (matches old behavior of leaving entries).
			const existing = this.findProvider(id);
			if (existing) {
				this.upsertProvider({ ...existing, apiKey: '' });
			}
		}
		// Auto-enable assistant once any apiKey is set.
		const services = this.store.get('services') ?? DEFAULT_SERVICES;
		if (trimmedApiKey.length > 0 && !services.assistant.enabled) {
			this.setAssistantService({ enabled: true });
		}
		return this.getAssistantAiSettings();
	}

	setAssistantAiSelection(selection: AssistantAiSelection): AssistantAiSettings {
		const selectedProvider = selection.selectedProvider.trim().toLowerCase();
		const selectedModel = selection.selectedModel.trim();
		if (!PROVIDERS.some((provider) => provider.id === selectedProvider)) {
			throw new Error('Invalid provider');
		}
		if (!selectedModel) throw new Error('Invalid model');

		this.setAssistantService({
			llm: { providerId: selectedProvider, model: selectedModel },
			enabled: true,
		});
		return this.getAssistantAiSettings();
	}

	// ---- Provider (legacy {openai, anthropic} shape) ------------------------

	/** Legacy: returns the legacy `{openai, anthropic}` shape derived from v2 map. */
	getProvider(): LegacyProvider {
		const map = this.store.get('providers') ?? {};
		return {
			openai: {
				apikey: map.openai?.apiKey ?? '',
				model: map.openai?.defaultModel ?? '',
			},
			anthropic: {
				apikey: map.anthropic?.apiKey ?? '',
				model: map.anthropic?.defaultModel ?? '',
			},
		};
	}

	getProviders(): ProviderEntry[] {
		return providerMapToEntries(this.store.get('providers') ?? {});
	}

	getProviderById(providerId: string): ProviderEntry | undefined {
		const normalized = providerId.trim();
		const provider = this.findProvider(normalized);
		if (!provider) return undefined;
		return providerToEntry(provider) ?? undefined;
	}

	addProvider(provider: ProviderEntry): ProviderEntry {
		const incoming = normalizeProviderInput(provider);
		if (!incoming) throw new Error('Invalid provider');
		this.upsertProvider({
			id: incoming.id,
			name: incoming.name,
			kinds: defaultKindsForId(incoming.id),
			apiKey: incoming.apiKey,
			defaultModel: incoming.model || undefined,
		});
		return { ...incoming };
	}

	deleteProvider(providerId: string): void {
		const normalized = providerId.trim().toLowerCase();
		this.removeProvider(normalized);
	}

	// ---- Per-provider getters/setters (openai, anthropic) ------------------

	setOpenAIProvider(apikey: string, model: string): ProviderConfig {
		this.upsertProvider({
			id: 'openai',
			kinds: defaultKindsForId('openai'),
			apiKey: apikey,
			defaultModel: model || undefined,
		});
		return { apikey, model };
	}

	getOpenAIKey(): string {
		return this.findProvider('openai')?.apiKey ?? '';
	}

	getOpenAIModel(): string {
		return this.findProvider('openai')?.defaultModel ?? '';
	}

	setOpenAIKey(apikey: string): ProviderConfig {
		return this.setOpenAIProvider(apikey, this.getOpenAIModel());
	}

	setOpenAIModel(model: string): ProviderConfig {
		return this.setOpenAIProvider(this.getOpenAIKey(), model);
	}

	setAnthropicProvider(apikey: string, model: string): ProviderConfig {
		this.upsertProvider({
			id: 'anthropic',
			kinds: defaultKindsForId('anthropic'),
			apiKey: apikey,
			defaultModel: model || undefined,
		});
		return { apikey, model };
	}

	getAnthropicKey(): string {
		return this.findProvider('anthropic')?.apiKey ?? '';
	}

	getAnthropicModel(): string {
		return this.findProvider('anthropic')?.defaultModel ?? '';
	}

	setAnthropicKey(apikey: string): ProviderConfig {
		return this.setAnthropicProvider(apikey, this.getAnthropicModel());
	}

	setAnthropicModel(model: string): ProviderConfig {
		return this.setAnthropicProvider(this.getAnthropicKey(), model);
	}

	// ---- AssistantConfiguration (legacy single apiKey/model slot) ----------

	getAssistantConfiguration(): AssistantConfiguration {
		const ref = this.getAssistantService().llm;
		const resolved = this.resolveProviderRef(ref);
		return {
			apikey: resolved?.provider.apiKey ?? '',
			model: ref.model ?? resolved?.model ?? '',
		};
	}

	getAssistantApiKey(): string {
		return this.getAssistantConfiguration().apikey;
	}

	getAssistantModel(): string {
		return this.getAssistantService().llm.model ?? '';
	}

	setAssistantConfiguration(apikey: string, model: string): AssistantConfiguration {
		const ref = this.getAssistantService().llm;
		const targetId = ref.providerId || DEFAULT_ASSISTANT_AI_PROVIDER;
		this.upsertProvider({
			id: targetId,
			kinds: defaultKindsForId(targetId),
			apiKey: apikey,
		});
		this.setAssistantService({
			llm: { providerId: targetId, model },
			enabled: apikey.trim().length > 0,
		});
		return { apikey, model };
	}

	setAssistantApiKey(apikey: string): AssistantConfiguration {
		return this.setAssistantConfiguration(apikey, this.getAssistantModel());
	}

	setAssistantModel(model: string): AssistantConfiguration {
		return this.setAssistantConfiguration(this.getAssistantApiKey(), model);
	}

	// ---- Profile / startup ---------------------------------------------------

	getProfile(): UserProfile | null {
		const profile = this.store.get('profile');
		if (!profile) return null;
		return { firstName: profile.firstName, lastName: profile.lastName };
	}

	setProfile(profile: UserProfile): UserProfile {
		const next: UserProfile = {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		};
		this.store.set('profile', next);
		return next;
	}

	getStartupInfo(): AppStartupInfo {
		return { startupCount: 0, isFirstRun: false, isInitialized: true };
	}

	completeFirstRunConfiguration(
		profile: UserProfile,
		providers: ProviderEntry[]
	): AppStartupInfo {
		const incoming = normalizeProviderEntries(providers).filter(
			(p) => p.apiKey.trim().length > 0
		);
		for (const entry of incoming) {
			this.upsertProvider({
				id: entry.id,
				name: entry.name,
				kinds: defaultKindsForId(entry.id),
				apiKey: entry.apiKey,
				defaultModel: entry.model || undefined,
			});
		}
		this.store.set('profile', {
			firstName: profile.firstName.trim(),
			lastName: profile.lastName.trim(),
		});
		return this.getStartupInfo();
	}

	// =========================================================================
	// Channels (unchanged shape)
	// =========================================================================

	getChannel(): Channel | null {
		const channel = this.store.get('channel');
		if (!channel) return null;
		return {
			telegram: this.getTelegramChannel(),
			whatsapp: this.getWhatsappChannel(),
			discord: this.getDiscordChannel(),
		};
	}

	private ensureChannel(): void {
		if (this.store.get('channel')) return;
		this.store.set('channel', {
			telegram: { token: '', allowFrom: [] },
			whatsapp: { phoneNumber: '', token: '' },
			discord: { token: '', allowFrom: [] },
		});
	}

	getTelegramChannel(): TelegramChannelProperties {
		const telegram = this.store.get('channel')?.telegram;
		return {
			token: telegram?.token ?? DEFAULT_TELEGRAM_CHANNEL.token,
			allowFrom: [...(telegram?.allowFrom ?? DEFAULT_TELEGRAM_CHANNEL.allowFrom)],
		};
	}

	setTelegramChannel(properties: TelegramChannelProperties): Channel {
		this.ensureChannel();
		const current = this.store.get('channel');
		const next: Channel = {
			...current,
			telegram: { token: properties.token, allowFrom: [...properties.allowFrom] },
		} as Channel;
		this.store.set('channel', next);
		return next;
	}

	setTelegramToken(token: string): Channel {
		return this.setTelegramChannel({ ...this.getTelegramChannel(), token });
	}

	setTelegramAllowFrom(allowFrom: string[]): Channel {
		return this.setTelegramChannel({
			...this.getTelegramChannel(),
			allowFrom: [...allowFrom],
		});
	}

	getWhatsappChannel(): WhatsappChannelProperties {
		const whatsapp = this.store.get('channel')?.whatsapp;
		return {
			phoneNumber: whatsapp?.phoneNumber ?? DEFAULT_WHATSAPP_CHANNEL.phoneNumber,
			token: whatsapp?.token ?? DEFAULT_WHATSAPP_CHANNEL.token,
		};
	}

	setWhatsappChannel(properties: WhatsappChannelProperties): Channel {
		this.ensureChannel();
		const current = this.store.get('channel');
		const next: Channel = {
			...current,
			whatsapp: { phoneNumber: properties.phoneNumber, token: properties.token },
		} as Channel;
		this.store.set('channel', next);
		return next;
	}

	setWhatsappPhoneNumber(phoneNumber: string): Channel {
		return this.setWhatsappChannel({ ...this.getWhatsappChannel(), phoneNumber });
	}

	setWhatsappToken(token: string): Channel {
		return this.setWhatsappChannel({ ...this.getWhatsappChannel(), token });
	}

	getDiscordChannel(): DiscordChannelProperties {
		const discord = this.store.get('channel')?.discord;
		return {
			token: discord?.token ?? DEFAULT_DISCORD_CHANNEL.token,
			allowFrom: [...(discord?.allowFrom ?? DEFAULT_DISCORD_CHANNEL.allowFrom)],
		};
	}

	setDiscordChannel(properties: DiscordChannelProperties): Channel {
		this.ensureChannel();
		const current = this.store.get('channel');
		const next: Channel = {
			...current,
			discord: { token: properties.token, allowFrom: [...properties.allowFrom] },
		} as Channel;
		this.store.set('channel', next);
		return next;
	}

	setDiscordToken(token: string): Channel {
		return this.setDiscordChannel({ ...this.getDiscordChannel(), token });
	}

	setDiscordAllowFrom(allowFrom: string[]): Channel {
		return this.setDiscordChannel({
			...this.getDiscordChannel(),
			allowFrom: [...allowFrom],
		});
	}

	setChannelProperties(
		type: ChannelType,
		properties:
			| TelegramChannelProperties
			| WhatsappChannelProperties
			| DiscordChannelProperties
	): Channel {
		if (type === 'whatsapp') return this.setWhatsappChannel(properties as WhatsappChannelProperties);
		if (type === 'telegram') return this.setTelegramChannel(properties as TelegramChannelProperties);
		return this.setDiscordChannel(properties as DiscordChannelProperties);
	}

	// =========================================================================
	// Migration
	// =========================================================================

	/**
	 * One-shot migration from v1 (hardcoded openai/anthropic + assistantAi +
	 * assistantConfiguration) to v2 (provider registry + services map).
	 *
	 * Idempotent: runs only when `schemaVersion < 2`. Legacy keys are stashed
	 * in `_legacy` for one release in case rollback is needed.
	 */
	private migrateV1ToV2(): void {
		const currentVersion = this.store.get('schemaVersion');
		if (typeof currentVersion === 'number' && currentVersion >= STORE_SCHEMA_VERSION) return;

		const oldProvidersRaw = this.store.get('providers' as string);
		const oldAssistantAi = this.store.get('assistantAi' as string);
		const oldAssistantConfig = this.store.get('assistantConfiguration' as string);
		const oldProviderSingular = this.store.get('provider' as string);

		const newProviders: Record<string, Provider> = {};
		const now = Date.now();

		// --- Seed from legacy {openai, anthropic} shape -----------------------
		const seedFromLegacyMap = (raw: unknown): void => {
			if (!isRecord(raw)) return;
			for (const id of ['openai', 'anthropic'] as const) {
				const cfg = raw[id];
				if (!isRecord(cfg)) continue;
				const apiKey = stringOrEmpty(cfg.apikey) || stringOrEmpty(cfg.apiKey);
				const model = stringOrEmpty(cfg.model);
				if (!apiKey && !model) continue;
				newProviders[id] = {
					id,
					name: PROVIDERS.find((p) => p.id === id)?.name,
					kinds: defaultKindsForId(id),
					apiKey,
					defaultModel: model || undefined,
					createdAt: now,
					updatedAt: now,
				};
			}
		};

		seedFromLegacyMap(oldProviderSingular);
		seedFromLegacyMap(oldProvidersRaw);

		// `providers` could already be in v2 shape (Record<id, Provider>) if a
		// partial migration ran earlier. Detect by looking for `apiKey` field
		// and merge those entries too.
		if (isRecord(oldProvidersRaw)) {
			for (const [key, raw] of Object.entries(oldProvidersRaw)) {
				if (!isRecord(raw)) continue;
				if (!('apiKey' in raw) && !('kinds' in raw)) continue;
				const id = trimmedString(raw.id) || key;
				const apiKey = stringOrEmpty(raw.apiKey);
				if (!id) continue;
				const existing = newProviders[id];
				newProviders[id] = {
					id,
					name: existing?.name ?? PROVIDERS.find((p) => p.id === id)?.name,
					kinds: existing?.kinds ?? defaultKindsForId(id),
					apiKey: apiKey || existing?.apiKey || '',
					defaultModel: stringOrEmpty(raw.defaultModel) || existing?.defaultModel || undefined,
					createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : (existing?.createdAt ?? now),
					updatedAt: now,
				};
			}
		}

		// --- Overlay assistantAi.providers (apiKey wins if newer) -------------
		if (isRecord(oldAssistantAi) && Array.isArray(oldAssistantAi.providers)) {
			for (const entry of oldAssistantAi.providers) {
				if (!isRecord(entry)) continue;
				const id = trimmedString(entry.id).toLowerCase();
				const apiKey = stringOrEmpty(entry.apiKey);
				if (!id || !apiKey) continue;
				const existing = newProviders[id];
				newProviders[id] = {
					id,
					name: existing?.name ?? PROVIDERS.find((p) => p.id === id)?.name,
					kinds: existing?.kinds ?? defaultKindsForId(id),
					apiKey,
					defaultModel: existing?.defaultModel,
					createdAt: existing?.createdAt ?? now,
					updatedAt: now,
				};
			}
		}

		// --- Build services from assistantAi selection -----------------------
		const selectedProvider =
			isRecord(oldAssistantAi) && typeof oldAssistantAi.selectedProvider === 'string'
				? oldAssistantAi.selectedProvider.trim().toLowerCase()
				: '';
		const selectedModel =
			isRecord(oldAssistantAi) && typeof oldAssistantAi.selectedModel === 'string'
				? oldAssistantAi.selectedModel.trim()
				: '';

		const services: ServicesMap = {
			assistant: {
				enabled: Object.values(newProviders).some((p) => p.apiKey.trim().length > 0),
				llm: {
					providerId: selectedProvider || DEFAULT_ASSISTANT_AI_PROVIDER,
					model: selectedModel || DEFAULT_ASSISTANT_AI_MODEL,
				},
			},
			search: { ...DEFAULT_SEARCH_SERVICE, search: { ...DEFAULT_SEARCH_SERVICE.search } },
			rag: {
				enabled: false,
				embeddings: { ...DEFAULT_RAG_SERVICE.embeddings },
				llm: { ...DEFAULT_RAG_SERVICE.llm },
			},
		};

		// --- Persist ---------------------------------------------------------
		this.store.set('providers', newProviders);
		this.store.set('services', services);
		this.store.set('schemaVersion', STORE_SCHEMA_VERSION);

		const hadLegacy =
			oldAssistantAi !== undefined ||
			oldAssistantConfig !== undefined ||
			oldProviderSingular !== undefined;
		if (hadLegacy) {
			this.store.set('_legacy', {
				assistantAi: oldAssistantAi,
				assistantConfiguration: oldAssistantConfig,
				providers: oldProviderSingular,
			});
		}
		this.store.delete('assistantAi');
		this.store.delete('assistantConfiguration');
		this.store.delete('provider');
	}

	/** Ensure the v2 invariants (providers map + services map exist & are well-formed). */
	private ensureV2Defaults(): void {
		const providers = this.store.get('providers');
		const normalized = normalizeProviderMap(providers);
		this.store.set('providers', cloneProviderMap(normalized));

		const services = this.store.get('services');
		this.store.set('services', normalizeServices(services));

		if (this.store.get('schemaVersion') !== STORE_SCHEMA_VERSION) {
			this.store.set('schemaVersion', STORE_SCHEMA_VERSION);
		}
	}
}
