import type { OpenAiConnectorCatalogEntry, OpenAiConnectorId } from '../connectors';

export const PROVIDER_CONNECTOR_RUNTIME_STATUSES = [
	'local_oauth_and_local_tool_execution',
	'settings_catalog_only',
] as const;

export type ProviderConnectorRuntimeStatus =
	(typeof PROVIDER_CONNECTOR_RUNTIME_STATUSES)[number];

export interface ProviderConnectorDocsMetadata {
	readonly providerId: string;
	readonly providerName: string;
	readonly providerDocsPath: string;
	readonly providerDocsLabel: string;
	readonly runtimeStatus: ProviderConnectorRuntimeStatus;
}

export type ProviderConnectorId = OpenAiConnectorId;

export interface ProviderConnectorCatalogEntry
	extends Omit<OpenAiConnectorCatalogEntry, 'id' | 'docsPath' | 'docsLabel'> {
	readonly id: ProviderConnectorId;
	readonly docsPath: string;
	readonly docsLabel: string;
	readonly providerId: string;
	readonly providerName: string;
	readonly providerDocsPath: string;
	readonly providerDocsLabel: string;
	readonly runtimeStatus: ProviderConnectorRuntimeStatus;
}
