import type { ConnectorConfig, ConnectorStore } from './types';

export function connectorsToStore(connectors: readonly ConnectorConfig[]): ConnectorStore {
	const store: ConnectorStore = {};
	for (const connector of connectors) {
		const baseKey =
			connector.serverLabel.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') ||
			connector.connectorId.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') ||
			connector.id;
		const key = store[baseKey] && store[baseKey].id !== connector.id ? `${baseKey}_${connector.id}` : baseKey;
		store[key] = connector;
	}
	return store;
}
