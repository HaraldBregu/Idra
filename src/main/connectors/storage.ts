import type {
	ConnectorConfigValue,
	ConnectorRecord,
} from '../../shared/connectors';
import type { ConnectorApprovalMode, ConnectorConfig } from './types';

export function connectorsToStore(connectors: readonly ConnectorConfig[]): ConnectorRecord {
	const store: ConnectorRecord = {};
	for (const connector of connectors) {
		const authorization = connectorAuthorization(connector);
		const serverUrl = connector.serverUrl?.trim();
		if (!serverUrl) {
			if (!authorization) continue;
			throw new Error(`Connector serverUrl is required before storing ${connector.name}.`);
		}
		const baseKey = connectorStoreKey(connector);
		const key = store[baseKey] ? `${baseKey}_${connector.id}` : baseKey;
		store[key] = connectorToStoreEntry(connector, authorization, serverUrl);
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
	if (isConnectorConfigValue(value)) return [connectorFromStoreEntry(key, value)];
	if (isStoredConnector(value)) return [normalizeStoredConnector(value)];
	return [];
}

function connectorToStoreEntry(
	connector: ConnectorConfig,
	authorization: string,
	serverUrl: string
): ConnectorConfigValue {
	const requireApproval = toStoredRequireApproval(connector.requireApproval, connector.allowedTools);
	return {
		type: 'mcp',
		server_label: connector.serverLabel,
		server_url: serverUrl,
		...(connector.serverDescription ? { server_description: connector.serverDescription } : {}),
		...(authorization ? { authorization } : {}),
		...(requireApproval ? { require_approval: requireApproval } : {}),
		...(connector.allowedTools.length > 0 ? { allowed_tools: [...connector.allowedTools] } : {}),
		...(connector.deferLoading ? { defer_loading: true } : {}),
		...(connector.enabled === false ? { enabled: false } : {}),
		...(connector.tools.length > 0 ? { tools: connector.tools.map(toolToStoreEntry) } : {}),
		...(connector.lastRefreshedAt ? { last_refreshed_at: connector.lastRefreshedAt } : {}),
		...(connector.createdAt ? { created_at: connector.createdAt } : {}),
		...(connector.updatedAt ? { updated_at: connector.updatedAt } : {}),
		...(connector.lastError ? { last_error: connector.lastError } : {}),
	};
}

function connectorFromStoreEntry(key: string, entry: ConnectorConfigValue): ConnectorConfig {
	const now = new Date().toISOString();
	const serverLabel = entry.server_label.trim() || key;
	return {
		id: key,
		name: nameFromStoreKey(key),
		connectorId: key,
		serverLabel,
		serverDescription: entry.server_description?.trim() || undefined,
		serverUrl: entry.server_url.trim(),
		enabled: entry.enabled ?? true,
		authorization: entry.authorization?.trim() ?? '',
		oauth: undefined,
		requireApproval: toConnectorApprovalMode(entry.require_approval),
		allowedTools: uniqueStrings(entry.allowed_tools ?? []),
		deferLoading: entry.defer_loading ?? false,
		tools: (entry.tools ?? []).map(toolFromStoreEntry),
		lastRefreshedAt: entry.last_refreshed_at,
		createdAt: entry.created_at ?? now,
		updatedAt: entry.updated_at ?? now,
		lastError: entry.last_error,
	};
}

function normalizeStoredConnector(connector: ConnectorConfig): ConnectorConfig {
	const serverUrl =
		typeof connector.serverUrl === 'string' && connector.serverUrl.trim()
			? connector.serverUrl.trim()
			: undefined;
	return {
		...connector,
		serverUrl,
		authorization: typeof connector.authorization === 'string' ? connector.authorization : '',
		allowedTools: Array.isArray(connector.allowedTools) ? uniqueStrings(connector.allowedTools) : [],
		requireApproval: connector.requireApproval ?? 'always',
		deferLoading: connector.deferLoading ?? false,
		enabled: connector.enabled ?? true,
		tools: Array.isArray(connector.tools) ? connector.tools.map(normalizeStoredTool) : [],
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
): ConnectorConfigValue['require_approval'] {
	if (mode === 'never') return 'never';
	if (mode === 'never_for_allowed_tools' && allowedTools.length > 0) {
		return { never: { tool_names: [...allowedTools] } };
	}
	return undefined;
}

function toConnectorApprovalMode(value: ConnectorConfigValue['require_approval']): ConnectorApprovalMode {
	if (value === 'never') return 'never';
	if (value && typeof value === 'object') return 'never_for_allowed_tools';
	return 'always';
}

function isConnectorConfigValue(value: unknown): value is ConnectorConfigValue {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const entry = value as ConnectorConfigValue;
	return entry.type === 'mcp' && typeof entry.server_label === 'string' && typeof entry.server_url === 'string';
}

function isStoredConnector(value: unknown): value is ConnectorConfig {
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

function normalizeStoredTool(tool: ConnectorConfig['tools'][number]): ConnectorConfig['tools'][number] {
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission: tool.permission ?? 'always-allow',
		requiresApproval: tool.requiresApproval ?? false,
	};
}

function toolToStoreEntry(tool: ConnectorConfig['tools'][number]): NonNullable<ConnectorConfigValue['tools']>[number] {
	return {
		name: tool.name,
		description: tool.description,
		input_schema: tool.inputSchema,
		permission: tool.permission,
		requires_approval: tool.requiresApproval,
	};
}

function toolFromStoreEntry(tool: NonNullable<ConnectorConfigValue['tools']>[number]): ConnectorConfig['tools'][number] {
	return normalizeStoredTool({
		name: tool.name,
		description: tool.description,
		inputSchema: tool.input_schema,
		permission: tool.permission ?? 'always-allow',
		requiresApproval: tool.requires_approval ?? false,
	});
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
