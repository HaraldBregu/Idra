import providerDefinitions from '../../resources/model_providers.json';
import { normalizeProviderId } from './provider_models_definitions';
import type { ProviderModel } from './provider_models_types';

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
export interface ModelSelection {
	provider: PublicProvider;
	model: ProviderModel;
}

export const DEFAULT_PROVIDERS: readonly Provider[] = providerDefinitions as readonly Provider[];

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

export function hasDefaultProviderCapability(providerId: string, capability: string): boolean {
	const normalizedProviderId = normalizeProviderId(providerId);
	const provider = DEFAULT_PROVIDERS.find(
		(entry) => normalizeProviderId(entry.id) === normalizedProviderId
	);
	return provider ? providerHasCapability(provider, capability) : false;
}
