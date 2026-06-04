import type {
	ConnectorApprovalMode,
	ConnectorConfig,
	ConnectorConfigValue,
	ConnectorRecord,
	ConnectorTool,
} from './types';

export function connectorsToStore(connectors: readonly ConnectorRecord[]): ConnectorConfig {
	const store: ConnectorConfig = {};
	for (const connector of connectors) {
		const authorization = connectorAuthorization(connector);
		const serverUrl = connector.serverUrl?.trim();
		if (!authorization) continue;
		if (!serverUrl) throw new Error(`Connector serverUrl is required before storing ${connector.name}.`);
		const baseKey = connectorStoreKey(connector);
		const key = store[baseKey] ? `${baseKey}_${connector.id}` : baseKey;
		store[key] = connectorToStoreEntry(connector, authorization, serverUrl);
	}
	return store;
}

export function connectorsFromStore(value: unknown): ConnectorRecord[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry, index) => connectorFromStoreValue(String(index), entry));
	}
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, entry]) => connectorFromStoreValue(key, entry));
}

function connectorFromStoreValue(key: string, value: unknown): ConnectorRecord[] {
	if (isConnectorConfigValue(value)) return [connectorFromStoreEntry(key, value)];
	if (isStoredConnectorRecord(value)) return [normalizeStoredConnector(value)];
	return [];
}

function connectorToStoreEntry(
	connector: ConnectorRecord,
	authorization: string,
	serverUrl: string
): ConnectorConfigValue {
	const requireApproval = toStoredRequireApproval(connector.requireApproval, connector.allowedTools);
	return {
		type: 'mcp',
		server_label: connector.serverLabel,
		server_url: serverUrl,
		authorization,
		...(requireApproval ? { require_approval: requireApproval } : {}),
		...(connector.allowedTools.length > 0 ? { allowed_tools: [...connector.allowedTools] } : {}),
	};
}

function connectorFromStoreEntry(key: string, entry: ConnectorConfigValue): ConnectorRecord {
	const now = new Date().toISOString();
	const serverLabel = entry.server_label.trim() || key;
	return {
		id: key,
		name: nameFromStoreKey(key),
		connectorId: key,
		serverLabel,
		serverUrl: entry.server_url.trim(),
		enabled: true,
		authorization: entry.authorization?.trim() ?? '',
		oauth: undefined,
		requireApproval: toConnectorApprovalMode(entry.require_approval),
		allowedTools: uniqueStrings(entry.allowed_tools ?? []),
		deferLoading: false,
		tools: [],
		createdAt: now,
		updatedAt: now,
	};
}

function normalizeStoredConnector(connector: ConnectorRecord): ConnectorRecord {
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

function connectorStoreKey(connector: ConnectorRecord): string {
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

function connectorAuthorization(connector: ConnectorRecord): string {
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
	if (mode === 'never_for_allowed_tools' && allowedTools.length > 0) return 'never';
	return undefined;
}

function toConnectorApprovalMode(value: ConnectorConfigValue['require_approval']): ConnectorApprovalMode {
	if (value === 'never') return 'never';
	return 'always';
}

function isConnectorConfigValue(value: unknown): value is ConnectorConfigValue {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const entry = value as ConnectorConfigValue;
	return entry.type === 'mcp' && typeof entry.server_label === 'string' && typeof entry.server_url === 'string';
}

function isStoredConnectorRecord(value: unknown): value is ConnectorRecord {
	const connector = value as ConnectorRecord;
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
