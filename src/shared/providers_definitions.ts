import openai from '../../resources/providers/openai/provider.json';
import anthropic from '../../resources/providers/anthropic/provider.json';
import google from '../../resources/providers/google/provider.json';
import xai from '../../resources/providers/xai/provider.json';
import mistral from '../../resources/providers/mistral/provider.json';
import deepseek from '../../resources/providers/deepseek/provider.json';
import qwen from '../../resources/providers/qwen/provider.json';
import kimi from '../../resources/providers/kimi/provider.json';
import zai from '../../resources/providers/zai/provider.json';
import minimax from '../../resources/providers/minimax/provider.json';
import elevenlabs from '../../resources/providers/elevenlabs/provider.json';
import deepgram from '../../resources/providers/deepgram/provider.json';
import cartesia from '../../resources/providers/cartesia/provider.json';
import blackForestLabs from '../../resources/providers/black-forest-labs/provider.json';
import midjourney from '../../resources/providers/midjourney/provider.json';
import kling from '../../resources/providers/kling/provider.json';
import runway from '../../resources/providers/runway/provider.json';
import luma from '../../resources/providers/luma/provider.json';
import stabilityAi from '../../resources/providers/stability-ai/provider.json';
import ideogram from '../../resources/providers/ideogram/provider.json';
import pika from '../../resources/providers/pika/provider.json';
import suno from '../../resources/providers/suno/provider.json';
import reka from '../../resources/providers/reka/provider.json';
import perplexity from '../../resources/providers/perplexity/provider.json';
import cohere from '../../resources/providers/cohere/provider.json';
import voyage from '../../resources/providers/voyage/provider.json';
import nomic from '../../resources/providers/nomic/provider.json';
import jina from '../../resources/providers/jina/provider.json';
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

export const DEFAULT_PROVIDERS: readonly Provider[] = [
	openai,
	anthropic,
	google,
	xai,
	mistral,
	deepseek,
	qwen,
	kimi,
	zai,
	minimax,
	elevenlabs,
	deepgram,
	cartesia,
	blackForestLabs,
	midjourney,
	kling,
	runway,
	luma,
	stabilityAi,
	ideogram,
	pika,
	suno,
	reka,
	perplexity,
	cohere,
	voyage,
	nomic,
	jina,
];

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
