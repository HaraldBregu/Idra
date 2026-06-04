import mcpConnectorCatalog from './catalog.json';
import type { ConnectorCatalogEntry } from './types';

export const MCP_CONNECTOR_CATALOG = mcpConnectorCatalog as readonly ConnectorCatalogEntry[];

const MCP_CONNECTOR_BY_ID = new Map<string, ConnectorCatalogEntry>(
	MCP_CONNECTOR_CATALOG.map((connector) => [connector.id, connector])
);

export const MCP_CONNECTOR_CATALOG_COUNTS = {
	mcpConnectors: MCP_CONNECTOR_CATALOG.length,
} as const;

export function getMcpConnectorCatalogItem(id: string): ConnectorCatalogEntry | undefined {
	return MCP_CONNECTOR_BY_ID.get(id);
}
