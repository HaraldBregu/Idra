import type { ConnectorRecord } from '../../shared/connectors';

type ConnectorEntry = ConnectorRecord[string];

export function connectorsToStore(connectors: ConnectorRecord): ConnectorRecord {
	const store: ConnectorRecord = {};
	for (const [key, connector] of Object.entries(connectors)) {
		const authorization = connector.authorization?.trim() ?? '';
		const serverUrl = connector.server_url?.trim();
		if (!serverUrl) {
			if (!authorization) continue;
			throw new Error(`Connector serverUrl is required before storing ${connectorName(key, connector)}.`);
		}
		const baseKey = connectorStoreKey(key, connector);
		const storeKey = store[baseKey] ? `${baseKey}_${key}` : baseKey;
		store[storeKey] = connectorToStoreEntry(connector, authorization, serverUrl);
	}
	return store;
}

export function connectorsFromStore(value: unknown): ConnectorRecord {
	if (Array.isArray(value)) {
		return mergeConnectorEntries(
			value.flatMap((entry, index) => connectorFromStoreValue(String(index), entry))
		);
	}
	if (!value || typeof value !== 'object') return {};
	return mergeConnectorEntries(
		Object.entries(value).flatMap(([key, entry]) => connectorFromStoreValue(key, entry))
	);
}

function connectorFromStoreValue(key: string, value: unknown): Array<[string, ConnectorEntry]> {
	if (isConnectorRecordEntry(value)) return [[key, normalizeStoreEntry(key, value)]];
	const legacy = legacyConnectorToStoreEntry(value);
	return legacy ? [[legacy.key, legacy.connector]] : [];
}

function mergeConnectorEntries(entries: Array<[string, ConnectorEntry]>): ConnectorRecord {
	const record: ConnectorRecord = {};
	for (const [key, connector] of entries) {
		record[record[key] ? `${key}_${Object.keys(record).length}` : key] = connector;
	}
	return record;
}

function connectorToStoreEntry(
	connector: ConnectorEntry,
	authorization: string,
	serverUrl: string
): ConnectorEntry {
	const requireApproval = toStoredRequireApproval(connector.require_approval);
	return {
		type: 'mcp',
		server_label: connector.server_label.trim(),
		server_url: serverUrl,
		...(connector.server_description?.trim() ? { server_description: connector.server_description.trim() } : {}),
		...(authorization ? { authorization } : {}),
		...(requireApproval ? { require_approval: requireApproval } : {}),
		...(connector.defer_loading ? { defer_loading: true } : {}),
		...(connector.enabled === false ? { enabled: false } : {}),
		...(connector.last_refreshed_at ? { last_refreshed_at: connector.last_refreshed_at } : {}),
		...(connector.created_at ? { created_at: connector.created_at } : {}),
		...(connector.updated_at ? { updated_at: connector.updated_at } : {}),
		...(connector.last_error ? { last_error: connector.last_error } : {}),
	};
}

function normalizeStoreEntry(key: string, entry: ConnectorEntry): ConnectorEntry {
	const now = new Date().toISOString();
	return {
		type: 'mcp',
		server_label: entry.server_label.trim() || key,
		server_url: entry.server_url.trim(),
		...(entry.server_description?.trim() ? { server_description: entry.server_description.trim() } : {}),
		...(entry.authorization?.trim() ? { authorization: entry.authorization.trim() } : {}),
		...(toStoredRequireApproval(entry.require_approval) ? { require_approval: toStoredRequireApproval(entry.require_approval) } : {}),
		...(entry.defer_loading ? { defer_loading: true } : {}),
		...(entry.enabled === false ? { enabled: false } : {}),
		...(entry.last_refreshed_at ? { last_refreshed_at: entry.last_refreshed_at } : {}),
		created_at: entry.created_at ?? now,
		updated_at: entry.updated_at ?? now,
		...(entry.last_error ? { last_error: entry.last_error } : {}),
	};
}

function legacyConnectorToStoreEntry(value: unknown): { key: string; connector: ConnectorEntry } | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const connector = value as Record<string, unknown>;
	const id = readString(connector.id);
	const name = readString(connector.name);
	const connectorId = readString(connector.connectorId);
	const serverLabel = readString(connector.serverLabel);
	const serverUrl = readString(connector.serverUrl);
	if (!id || !name || !connectorId || !serverLabel || !serverUrl) return undefined;
	const key =
		storeKeyPart(readRecord(connector.oauth)?.serviceId) ||
		storeKeyPart(serverLabel) ||
		storeKeyPart(connectorId) ||
		id;
	return {
		key,
		connector: normalizeStoreEntry(key, {
			type: 'mcp',
			server_label: serverLabel,
			server_url: serverUrl,
			...(readString(connector.serverDescription) ? { server_description: readString(connector.serverDescription) } : {}),
			...(readString(connector.authorization) ? { authorization: readString(connector.authorization) } : {}),
			...(toStoredRequireApproval(readString(connector.requireApproval)) ? { require_approval: toStoredRequireApproval(readString(connector.requireApproval)) } : {}),
			...(connector.deferLoading === true ? { defer_loading: true } : {}),
			...(connector.enabled === false ? { enabled: false } : {}),
			...(readString(connector.lastRefreshedAt) ? { last_refreshed_at: readString(connector.lastRefreshedAt) } : {}),
			...(readString(connector.createdAt) ? { created_at: readString(connector.createdAt) } : {}),
			...(readString(connector.updatedAt) ? { updated_at: readString(connector.updatedAt) } : {}),
			...(readString(connector.lastError) ? { last_error: readString(connector.lastError) } : {}),
		}),
	};
}

function connectorStoreKey(key: string, connector: ConnectorEntry): string {
	return storeKeyPart(connector.server_label) || storeKeyPart(key) || key;
}

function connectorName(key: string, connector: ConnectorEntry): string {
	return connector.server_label?.trim() || key;
}

function storeKeyPart(value?: unknown): string {
	return typeof value === 'string'
		? value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '')
		: '';
}

function toStoredRequireApproval(value: unknown): ConnectorEntry['require_approval'] {
	return value === 'never' ? 'never' : undefined;
}

function isConnectorRecordEntry(value: unknown): value is ConnectorEntry {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const entry = value as ConnectorEntry;
	return entry.type === 'mcp' && typeof entry.server_label === 'string' && typeof entry.server_url === 'string';
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
