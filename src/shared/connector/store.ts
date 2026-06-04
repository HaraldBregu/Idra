import { migrateLegacyOpenAiConnector } from './legacy';
import type {
	ConnectorApprovalMode,
	ConnectorConfig,
	ConnectorOAuthCredential,
	ConnectorStore,
	ConnectorStoreEntry,
	ConnectorTool,
	OpenAiConnectorRequireApproval,
} from './types';

export function connectorsToStore(connectors: readonly ConnectorConfig[]): ConnectorStore {
	const store: ConnectorStore = {};
	for (const connector of connectors) {
		const migrated = migrateLegacyOpenAiConnector(connector);
		const authorization = connectorAuthorization(migrated);
		if (!authorization) continue;
		const baseKey = connectorStoreKey(migrated);
		const key = store[baseKey] ? `${baseKey}_${connector.id}` : baseKey;
		store[key] = connectorToStoreEntry(migrated, authorization);
	}
	return store;
}

export function connectorsFromStore(value: unknown): ConnectorConfig[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry, index) => connectorFromStoreValue(String(index), entry));
	}
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, entry]) => connectorFromStoreValue(key, entry));
}

function connectorFromStoreValue(key: string, value: unknown): ConnectorConfig[] {
	if (isConnectorStoreEntry(value)) return [connectorFromStoreEntry(key, value)];
	if (isStoredConnectorConfig(value)) return [normalizeStoredConnector(value)];
	return [];
}

function connectorToStoreEntry(connector: ConnectorConfig, authorization: string): ConnectorStoreEntry {
	const requireApproval = toStoredRequireApproval(connector.requireApproval, connector.allowedTools);
	return {
		type: 'mcp',
		server_label: connector.serverLabel,
		...(connector.serverUrl ? { server_url: connector.serverUrl } : { connector_id: connector.connectorId }),
		authorization,
		...(requireApproval === 'always' ? {} : { require_approval: requireApproval }),
		...(connector.allowedTools.length > 0 ? { allowed_tools: [...connector.allowedTools] } : {}),
		...(connector.deferLoading ? { defer_loading: true } : {}),
		...(connector.serverDescription ? { server_description: connector.serverDescription } : {}),
		...(connector.tools.length > 0 ? { tools: connector.tools.map(normalizeStoredTool) } : {}),
		...(connector.lastRefreshedAt ? { last_refreshed_at: connector.lastRefreshedAt } : {}),
		...(connector.lastError ? { last_error: connector.lastError } : {}),
	};
}

function connectorFromStoreEntry(key: string, entry: ConnectorStoreEntry): ConnectorConfig {
	const now = new Date().toISOString();
	const serverLabel = entry.server_label.trim() || key;
	const connectorId = entry.connector_id?.trim() || key;
	return {
		id: key,
		name: nameFromStoreKey(key),
		connectorId,
		serverLabel,
		serverDescription: entry.server_description?.trim() || undefined,
		serverUrl: entry.server_url?.trim() || undefined,
		enabled: true,
		authorization: entry.authorization?.trim() ?? '',
		mcp: undefined,
		oauth: undefined,
		requireApproval: toConnectorApprovalMode(entry.require_approval),
		allowedTools: uniqueStrings(entry.allowed_tools ?? []),
		deferLoading: entry.defer_loading ?? false,
		tools: Array.isArray(entry.tools) ? entry.tools.map(normalizeStoredTool) : [],
		lastRefreshedAt: entry.last_refreshed_at,
		lastError: entry.last_error,
		createdAt: now,
		updatedAt: now,
	};
}

function normalizeStoredConnector(connector: ConnectorConfig): ConnectorConfig {
	const serverUrl =
		typeof connector.serverUrl === 'string' && connector.serverUrl.trim()
			? connector.serverUrl.trim()
			: undefined;
	const migrated = migrateLegacyOpenAiConnector({ ...connector, serverUrl });
	return {
		...migrated,
		authorization: typeof migrated.authorization === 'string' ? migrated.authorization : '',
		allowedTools: Array.isArray(migrated.allowedTools) ? uniqueStrings(migrated.allowedTools) : [],
		requireApproval: migrated.requireApproval ?? 'always',
		deferLoading: migrated.deferLoading ?? false,
		enabled: migrated.enabled ?? true,
		tools: Array.isArray(migrated.tools) ? migrated.tools.map(normalizeStoredTool) : [],
	};
}

function connectorStoreKey(connector: ConnectorConfig): string {
	return (
		storeKeyPart(connector.oauth?.serviceId) ||
		storeKeyPart(connector.serverLabel) ||
		storeKeyPart(connector.connectorId) ||
		connector.id
	);
}

function storeKeyPart(value?: string): string {
	return value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') ?? '';
}

function connectorAuthorization(connector: ConnectorConfig): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

function toStoredRequireApproval(
	mode: ConnectorApprovalMode,
	allowedTools: readonly string[]
): OpenAiConnectorRequireApproval {
	if (mode === 'never') return 'never';
	if (mode === 'never_for_allowed_tools') return { never: { tool_names: [...allowedTools] } };
	return 'always';
}

function toConnectorApprovalMode(value: ConnectorStoreEntry['require_approval']): ConnectorApprovalMode {
	if (value === 'never') return 'never';
	if (value && typeof value === 'object') return 'never_for_allowed_tools';
	return 'always';
}

function isConnectorStoreEntry(value: unknown): value is ConnectorStoreEntry {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const entry = value as ConnectorStoreEntry;
	return entry.type === 'mcp' && typeof entry.server_label === 'string';
}

function isStoredConnectorConfig(value: unknown): value is ConnectorConfig {
	const connector = value as ConnectorConfig;
	return (
		typeof connector === 'object' &&
		connector !== null &&
		typeof connector.id === 'string' &&
		typeof connector.name === 'string' &&
		typeof connector.connectorId === 'string' &&
		typeof connector.serverLabel === 'string'
	);
}

function normalizeStoredTool(tool: ConnectorTool): ConnectorTool {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission: tool.permission ?? 'always-allow',
		requiresApproval: tool.requiresApproval ?? false,
	};
}

function nameFromStoreKey(key: string): string {
	return key
		.split(/[_-]+/u)
		.map((part) => part ? part[0].toUpperCase() + part.slice(1) : '')
		.join(' ')
		.trim() || key;
}

function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
