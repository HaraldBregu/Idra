import { OPENAI_CONNECTOR_CATALOG } from './connectors';
import { PROVIDER_CONNECTOR_DOCS } from './provider-docs';
import type {
	ProviderConnectorCatalogEntry,
	ProviderConnectorId,
} from './models';

export const PROVIDER_CONNECTOR_CATALOG = OPENAI_CONNECTOR_CATALOG.map((connector) => {
	const docs = PROVIDER_CONNECTOR_DOCS[connector.id];
	return {
		...connector,
		docsPath: docs.providerDocsPath,
		docsLabel: docs.providerDocsLabel,
		...docs,
	};
}) as readonly ProviderConnectorCatalogEntry[];

const PROVIDER_CONNECTOR_BY_ID = new Map<ProviderConnectorId, ProviderConnectorCatalogEntry>(
	PROVIDER_CONNECTOR_CATALOG.map((connector) => [connector.id, connector])
);

export const PROVIDER_CONNECTOR_CATALOG_COUNTS = {
	providerConnectors: PROVIDER_CONNECTOR_CATALOG.length,
} as const;

export function getProviderConnectorCatalogItem(
	id: string
): ProviderConnectorCatalogEntry | undefined {
	return PROVIDER_CONNECTOR_BY_ID.get(id as ProviderConnectorId);
}

export function isProviderConnectorId(value: string): value is ProviderConnectorId {
	return PROVIDER_CONNECTOR_BY_ID.has(value as ProviderConnectorId);
}

export function listProviderConnectorsByProvider(
	providerId: string
): ProviderConnectorCatalogEntry[] {
	return PROVIDER_CONNECTOR_CATALOG.filter(
		(connector) => connector.providerId === providerId.trim().toLowerCase()
	);
}
