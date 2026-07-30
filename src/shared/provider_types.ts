import type { ModelCapability, ProviderModel } from './model_types';

export interface ProviderApiConfiguration {
	readonly credentialType: string | null;
	readonly apiKeyManagementUrl: string | null;
	readonly configurationDocsUrl: string | null;
	readonly authMethod: string | null;
	readonly recommendedEnvVars: readonly string[];
	readonly baseUrls: readonly string[];
	readonly importantNotes: readonly string[];
}

export interface Provider {
	readonly id: string;
	readonly name: string;
	readonly baseUrl: string;
	readonly apiKey: string;
	readonly capabilities?: string;
	/** Provider dashboard page where API keys are created. */
	readonly apiKeyUrl?: string;
	readonly apiConfiguration?: ProviderApiConfiguration;
}

export type PublicProvider = Omit<Provider, 'apiKey'>;
export type ProviderInput = Provider;

/** One model in resources/providers/<id>/models.json. */
export interface CatalogEntryModel extends ProviderModel {
	readonly type: ModelCapability;
	/** Base URL of the API serving this model. */
	readonly url: string;
	/** Preferred provider for this model's capability when nothing is configured. */
	readonly default?: boolean;
	/** Speech-to-text only: realtime capture sample rate. */
	readonly sampleRate?: number;
}

/** One entry in resources/providers/<id>/databases.json or storages.json. */
export interface CatalogEntryService {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	/** Base URL of the API serving this service. */
	readonly url?: string;
}

/** A database or storage offering, carrying the provider that serves it. */
export interface CatalogService extends CatalogEntryService {
	readonly provider: PublicProvider;
}

/** One entry in resources/providers/<id>/web_search.json. */
export interface CatalogEntryWebSearch {
	readonly id: string;
	readonly name: string;
	/** Base URL of the web search API. */
	readonly url: string;
}

/** A web search offering, carrying the provider that serves it. */
export interface CatalogWebSearch extends CatalogEntryWebSearch {
	readonly provider: PublicProvider;
}

/** Provider identity, as stored in resources/providers/<id>/info.json. */
export interface ProviderCatalogEntry {
	readonly id: string;
	readonly name: string;
	/** Provider dashboard page where API keys are created. */
	readonly apiKeyUrl?: string;
}

export interface ModelSelection {
	provider: PublicProvider;
	model: ProviderModel;
}

/** Which settings-store collection a provider credential belongs to. */
export type StoredProviderKind = 'models' | 'databases';

/** A provider's credentials as saved by the user. */
export interface StoredProvider {
	id: string;
	name: string;
	apiKey: string;
	baseUrl: string;
}

export interface ResolvedProvider {
	id: string;
	apiKey: string;
	baseURL: string;
}

export function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getProviderApiConfigurationUrl(
	provider: Pick<Provider, 'apiKeyUrl' | 'apiConfiguration' | 'baseUrl'>
): string {
	return (
		provider.apiKeyUrl?.trim() ||
		provider.apiConfiguration?.apiKeyManagementUrl?.trim() ||
		provider.apiConfiguration?.configurationDocsUrl?.trim() ||
		provider.baseUrl.trim()
	);
}

function providerCapabilityTokens(provider: Pick<Provider, 'capabilities'>): string[] {
	return (provider.capabilities ?? '')
		.split(/\s+-\s+/)
		.map((capability) => capability.trim().toLowerCase())
		.filter(Boolean);
}

export function providerHasCapability(
	provider: Pick<Provider, 'capabilities'>,
	capability: string
): boolean {
	return providerCapabilityTokens(provider).includes(capability.trim().toLowerCase());
}

export function providerHasImageCapability(provider: Pick<Provider, 'capabilities'>): boolean {
	return providerHasCapability(provider, 'Image');
}
