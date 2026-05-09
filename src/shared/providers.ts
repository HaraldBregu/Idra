// ---------------------------------------------------------------------------
// Shared AI Provider Constants & Types — Provider Catalogue, definitions, lookup
// ---------------------------------------------------------------------------
// DO NOT import Electron, Node.js, React, or any browser APIs here.
// This file must be valid in all three process contexts (main, renderer, preload).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProviderId = 'openai' | 'anthropic';

export interface ProviderDefinition {
	id: ProviderId;
	name: 'OpenAI' | 'Anthropic';
}

export interface ProviderConfig {
	apikey: string;
	model: string;
}

export interface Provider {
	id: ProviderId;
	name: 'OpenAI' | 'Anthropic';
	apikey: string;
	url: string;
}

export interface ProviderEntry {
	id: ProviderId;
	name: 'OpenAI' | 'Anthropic';
	apiKey: string;
	model: string;
}

/**
 * Single model entry as returned by a provider's `/models` endpoint.
 * Shape is normalised across providers.
 */
export interface ProviderModelInfo {
	/** Provider's model identifier (e.g. `gpt-4o`, `claude-3-5-sonnet-20240620`). */
	id: string;
	/** Human-readable name. Falls back to `id` when the provider has no display name. */
	name: string;
	/** ISO 8601 timestamp when the model was published. Empty string when unknown. */
	createdAt: string;
	/** Owner / publisher (e.g. `openai`, `anthropic`, organisation slug). */
	ownedBy: string;
}

// ---------------------------------------------------------------------------
// Provider catalogue — source of truth for provider IDs and names
// ---------------------------------------------------------------------------

/** Canonical list of known providers. Source of truth for provider IDs and names. */
export const PROVIDERS = [
	{ id: 'openai', name: 'OpenAI' },
	{ id: 'anthropic', name: 'Anthropic' },
] as const satisfies readonly ProviderDefinition[];

// ---------------------------------------------------------------------------
// Provider constants — sourced from PROVIDERS tuple
// ---------------------------------------------------------------------------

const findProvider = <TId extends ProviderId>(
	id: TId
): Extract<(typeof PROVIDERS)[number], { id: TId }> =>
	PROVIDERS.find((p) => p.id === id) as Extract<(typeof PROVIDERS)[number], { id: TId }>;

export const OPENAI = findProvider('openai');
export const ANTHROPIC = findProvider('anthropic');

export const PROVIDER_CATALOGUE: readonly ProviderDefinition[] = PROVIDERS;

export const PROVIDER_IDS: readonly ProviderId[] = PROVIDERS.map((p) => p.id);

// ---------------------------------------------------------------------------
// Derived lookup map (built once at module load)
// ---------------------------------------------------------------------------

const PROVIDER_MAP: Readonly<Record<string, ProviderDefinition>> = Object.fromEntries(
	PROVIDER_CATALOGUE.map((p) => [p.id, p])
);

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/** Look up a provider by ID. */
export function getProvider(providerId: string): ProviderDefinition | undefined {
	return PROVIDER_MAP[providerId];
}

/** Get all providers for UI display. */
export function getProvidersForDisplay(): readonly ProviderDefinition[] {
	return PROVIDER_CATALOGUE;
}

/** Returns `true` if the provider ID is in the catalogue. */
export function isKnownProvider(providerId: string): providerId is ProviderId {
	return providerId in PROVIDER_MAP;
}
