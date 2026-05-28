import { CONNECTOR_TOOL_PERMISSIONS, DEFAULT_CONNECTOR_TOOL_PERMISSION } from '../../shared/connector';
import type {
	ConnectorConfig,
	ConnectorMcpConfig,
	ConnectorOAuthTokenSet,
	ConnectorProviderId,
	ConnectorTool,
	ConnectorToolPermission,
} from '../../shared/connector';
import { authorizationFromMcp, connectorAuthKindFor } from './config';

const CONNECTOR_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;

export type RuntimeConnector = ConnectorConfig & {
	id: string;
	name: string;
	connectorId: ConnectorProviderId;
	serverLabel: string;
	enabled: boolean;
	authorization: string;
	requireApproval: NonNullable<ConnectorConfig['requireApproval']>;
	allowedTools: string[];
	deferLoading: boolean;
	tools: ConnectorTool[];
	createdAt: string;
	updatedAt: string;
};

export function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

export function isStoredConnectorValid(connector: ConnectorConfig, storageKey?: string): boolean {
	return (
		(
			typeof connector.id === 'string' &&
			typeof connector.name === 'string' &&
			typeof connector.connectorId === 'string' &&
			CONNECTOR_ID_PATTERN.test(connector.connectorId)
		) ||
		Boolean(storageKey && connector.mcp)
	);
}

export function normalizeStoredConnector(connector: ConnectorConfig, storageKey?: string): RuntimeConnector {
	const name = connector.name ?? titleFromStorageKey(storageKey) ?? 'MCP Connector';
	const connectorId = connector.connectorId ?? storageKey ?? serverLabelFromName(name);
	const serverLabel = connector.serverLabel ?? storageKey ?? serverLabelFromName(name);
	const createdAt = typeof connector.createdAt === 'string' ? connector.createdAt : '';
	const updatedAt = typeof connector.updatedAt === 'string' ? connector.updatedAt : createdAt;
	return {
		...connector,
		id: typeof connector.id === 'string' ? connector.id : storageKey ?? connectorId,
		name,
		connectorId,
		serverLabel,
		token: normalizeTokenSet(connector.token) ??
			normalizeTokenSet(connector.oauth?.token) ??
			tokenFromAuthorization(typeof connector.authorization === 'string' ? connector.authorization : '') ??
			tokenFromAuthorization(authorizationFromMcp(connector.mcp)),
		authorization: connectorAuthorization(connector),
		enabled: typeof connector.enabled === 'boolean' ? connector.enabled : true,
		requireApproval: connector.requireApproval ?? 'always',
		allowedTools: Array.isArray(connector.allowedTools) ? connector.allowedTools : [],
		deferLoading: typeof connector.deferLoading === 'boolean' ? connector.deferLoading : false,
		tools: Array.isArray(connector.tools)
			? connector.tools.flatMap((tool) => isConnectorToolRecord(tool) ? [normalizeConnectorTool(tool)] : [])
			: [],
		createdAt,
		updatedAt,
	};
}

export function toStoredConnectorRecords(connectors: readonly RuntimeConnector[]): Record<string, ConnectorConfig> {
	const records: Record<string, ConnectorConfig> = {};
	for (const connector of connectors) {
		const normalized = normalizeStoredConnector(connector);
		const baseKey = connectorStorageKey(normalized);
		let key = baseKey;
		let suffix = 2;
		while (records[key]) {
			key = baseKey + '_' + suffix;
			suffix += 1;
		}
		records[key] = toStoredConnectorRecord(normalized, key);
	}
	return records;
}

export function connectorStorageKey(connector: ConnectorConfig): string {
	return sanitizeConnectorStorageKey(connector.serverLabel ?? connector.connectorId ?? connector.id ?? connector.name ?? 'connector');
}

export function uniqueConnectorStorageKey(value: string, connectors: readonly RuntimeConnector[]): string {
	const existing = new Set(connectors.map((connector) => connectorStorageKey(connector)));
	const baseKey = sanitizeConnectorStorageKey(value);
	let key = baseKey;
	let suffix = 2;
	while (existing.has(key)) {
		key = baseKey + '_' + suffix;
		suffix += 1;
	}
	return key;
}

export function isConnectorToolRecord(value: unknown): value is ConnectorTool {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value) && typeof (value as ConnectorTool).name === 'string');
}

export function normalizeConnectorTools(
	tools: readonly ConnectorTool[],
	fallbackPermission: ConnectorToolPermission = DEFAULT_CONNECTOR_TOOL_PERMISSION
): ConnectorTool[] {
	return tools.map((tool) => normalizeConnectorTool(tool, fallbackPermission));
}

export function normalizeConnectorTool(
	tool: ConnectorTool,
	fallbackPermission: ConnectorToolPermission = DEFAULT_CONNECTOR_TOOL_PERMISSION
): ConnectorTool {
	const permission = normalizeToolPermission(tool.permission, tool.requiresApproval, fallbackPermission);
	return {
		name: tool.name,
		description: tool.description,
		inputSchema: tool.inputSchema,
		permission,
		requiresApproval: permission === 'needs-approval',
	};
}

export function oauthAuthorizationHeader(token: ConnectorOAuthTokenSet | undefined): string {
	if (!token?.accessToken) return '';
	return (token.tokenType?.trim() || 'Bearer') + ' ' + token.accessToken;
}

export function connectorAuthorization(connector: ConnectorConfig | undefined): string {
	if (!connector) return '';
	return (
		oauthAuthorizationHeader(connector.token) ||
		oauthAuthorizationHeader(connector.oauth?.token) ||
		connector.authorization?.trim() ||
		authorizationFromMcp(connector.mcp)
	);
}

export function tokenFromAuthorization(authorization: string | undefined): ConnectorOAuthTokenSet | undefined {
	const value = authorization?.trim();
	if (!value) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(value);
	if (!match?.[1]?.trim()) return undefined;
	return { accessToken: match[1].trim(), tokenType: 'Bearer' };
}

function toStoredConnectorRecord(connector: RuntimeConnector, storageKey: string): ConnectorConfig {
	const mcp = connector.mcp ? compactMcpConfig(mcpWithoutAuthorization(connector.mcp)) : undefined;
	const token = tokenForStorage(connector);
	const authorization = token ? '' : connectorAuthorization(connector);
	const authKind = connectorAuthKindFor(connector);
	return {
		...(connector.id && connector.id !== storageKey ? { id: connector.id } : {}),
		...(connector.name && connector.name !== titleFromStorageKey(storageKey) ? { name: connector.name } : {}),
		...(connector.connectorId && connector.connectorId !== storageKey ? { connectorId: connector.connectorId } : {}),
		...(authKind === 'oauth' ? { authKind } : {}),
		...(connector.serverDescription ? { serverDescription: connector.serverDescription } : {}),
		...(connector.enabled === false ? { enabled: false } : {}),
		...(connector.requireApproval !== 'always' ? { requireApproval: connector.requireApproval } : {}),
		...(connector.allowedTools.length > 0 ? { allowedTools: connector.allowedTools } : {}),
		...(connector.deferLoading ? { deferLoading: true } : {}),
		...(mcp ? { mcp: compactMcpConfig(mcp) } : {}),
		...(token ? { token } : {}),
		...(authorization ? { authorization } : {}),
		...(connector.lastRefreshedAt ? { lastRefreshedAt: connector.lastRefreshedAt } : {}),
		...(connector.lastError ? { lastError: connector.lastError } : {}),
		tools: connector.tools,
	};
}

function sanitizeConnectorStorageKey(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '') || 'connector';
}

function titleFromStorageKey(storageKey?: string): string | undefined {
	if (!storageKey) return undefined;
	const words = storageKey
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return undefined;
	return words.map((word) => {
		const lower = word.toLowerCase();
		if (lower === 'mcp') return 'MCP';
		return word.charAt(0).toUpperCase() + word.slice(1);
	}).join(' ');
}

function normalizeToolPermission(
	permission: unknown,
	requiresApproval: unknown,
	fallbackPermission: ConnectorToolPermission
): ConnectorToolPermission {
	if (typeof permission === 'string' && (CONNECTOR_TOOL_PERMISSIONS as readonly string[]).includes(permission)) {
		return permission as ConnectorToolPermission;
	}
	if (requiresApproval === true) return 'needs-approval';
	if (requiresApproval === false) return 'always-allow';
	return fallbackPermission;
}

function mcpWithoutAuthorization(mcp: ConnectorMcpConfig): ConnectorMcpConfig {
	if (mcp.transport !== 'http') return mcp;
	const headers = Object.fromEntries(
		Object.entries(mcp.headers ?? {}).filter(([key]) => key.toLowerCase() !== 'authorization')
	);
	return {
		...mcp,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
	};
}

function compactMcpConfig(mcp: ConnectorMcpConfig): ConnectorMcpConfig {
	if (mcp.transport === 'http') {
		return {
			transport: 'http',
			url: mcp.url,
			...(mcp.method ? { method: mcp.method } : {}),
			...(mcp.headers && Object.keys(mcp.headers).length > 0 ? { headers: mcp.headers } : {}),
			...(mcp.sessionId ? { sessionId: mcp.sessionId } : {}),
			...(mcp.auth ? { auth: mcp.auth } : {}),
		};
	}
	return {
		transport: 'stdio',
		command: mcp.command,
		...(mcp.args ? { args: mcp.args } : {}),
		...(mcp.cwd ? { cwd: mcp.cwd } : {}),
		...(mcp.env && Object.keys(mcp.env).length > 0 ? { env: mcp.env } : {}),
		...(mcp.envSecrets ? { envSecrets: mcp.envSecrets } : {}),
	};
}

function normalizeTokenSet(token: ConnectorOAuthTokenSet | undefined): ConnectorOAuthTokenSet | undefined {
	if (!token?.accessToken?.trim()) return undefined;
	return {
		accessToken: token.accessToken.trim(),
		refreshToken: token.refreshToken?.trim() || undefined,
		tokenType: token.tokenType?.trim() || undefined,
		scope: token.scope?.trim() || undefined,
		expiresAt: token.expiresAt?.trim() || undefined,
	};
}

function tokenForStorage(connector: ConnectorConfig): ConnectorOAuthTokenSet | undefined {
	return normalizeTokenSet(connector.token) ??
		normalizeTokenSet(connector.oauth?.token) ??
		tokenFromAuthorization(connector.authorization) ??
		tokenFromAuthorization(authorizationFromMcp(connector.mcp));
}
