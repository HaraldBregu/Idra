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
	readonly apiConfiguration?: ProviderApiConfiguration;
}

export type PublicProvider = Omit<Provider, 'apiKey'>;
export type ProviderInput = Provider;

/** One provider entry per capability, as stored in resources/providers/<id>/provider.json. */
export interface ProviderCatalogEntry extends Provider {
	readonly type: ModelCapability;
	readonly models: readonly ProviderModel[];
	/** Preferred provider for this capability when nothing is configured. */
	readonly default?: boolean;
	/** Speech-to-text only: realtime capture sample rate. */
	readonly sampleRate?: number;
}

export type PublicProviderCatalogEntry = Omit<ProviderCatalogEntry, 'apiKey'>;

export interface ModelSelection {
	provider: PublicProvider;
	model: ProviderModel;
}

/** A provider's credentials as saved by the user. */
export interface StoredProvider {
	name: string;
	apiKey: string;
	baseUrl: string;
}

export type ProviderRecord = Record<string, StoredProvider>;

export interface ResolvedProvider {
	id: string;
	apiKey: string;
	baseURL: string;
}

export function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getProviderApiConfigurationUrl(
	provider: Pick<Provider, 'apiConfiguration' | 'baseUrl'>
): string {
	return (
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
