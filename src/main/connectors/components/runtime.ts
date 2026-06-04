import type {
	ConnectorConfig,
	ConnectorOAuthCredential,
	ConnectorStatus,
	ConnectorView,
	requiredOpenAiConnectorScopes,
} from '../../../shared/connector';

export function cloneValue<T>(value: T): T {
	if (value === undefined || value === null) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function isOpenAiResponsesConnector(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return !connector.mcp || Boolean(connector.serverUrl);
}

export function isOpenAiConnectorIdConfig(connector: Pick<ConnectorConfig, 'mcp' | 'serverUrl'>): boolean {
	return isOpenAiResponsesConnector(connector) && !connector.serverUrl;
}

export function requiredMcpSecretNames(connector: ConnectorConfig): string[] {
	const mcp = connector.mcp;
	if (!mcp) return [];
	if (mcp.transport === 'http') return mcp.auth?.env ? [mcp.auth.env] : [];
	if (mcp.transport === 'stdio') return (mcp.envSecrets ?? []).map((secret) => secret.env);
	return [];
}

export function hasMissingMcpSecrets(connector: ConnectorConfig, env: NodeJS.ProcessEnv): boolean {
	return requiredMcpSecretNames(connector).some((name) => !env[name]);
}

export function connectorAuthorization(connector: ConnectorConfig): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

export function redactConnectorSecrets(connector: ConnectorConfig): ConnectorConfig {
	if (!connector.oauth) return { ...connector, authorization: '' };
	const token = connector.oauth.token;
	return {
		...connector,
		authorization: '',
		oauth: {
			...connector.oauth,
			accessToken: connector.oauth.accessToken ? '' : undefined,
			refreshToken: connector.oauth.refreshToken ? '' : undefined,
			clientSecret: connector.oauth.clientSecret ? '' : undefined,
			token: token
				? {
						...token,
						accessToken: '',
						refreshToken: token.refreshToken ? '' : undefined,
					}
				: undefined,
		},
	};
}

export function toConnectorView(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: authKindFor(connector),
		serverLabel: connector.serverLabel,
		serverUrl: connector.serverUrl,
		enabled: connector.enabled,
		status: toConnectorStatus(connector, env),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.accountEmail ?? connector.oauth?.email,
	};
}

export function toConnectorStatus(connector: ConnectorConfig, env: NodeJS.ProcessEnv): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isOpenAiConnectorIdConfig(connector) && !connectorAuthorization(connector)) return 'missing_auth';
	if (isOpenAiConnectorIdConfig(connector) && !hasRequiredOpenAiConnectorScopes(connector)) {
		return 'missing_auth';
	}
	if (hasMissingMcpSecrets(connector, env)) return 'missing_auth';
	if (connector.oauth && !connector.oauth.token?.accessToken && !connector.oauth.token?.refreshToken) {
		return 'missing_auth';
	}
	return 'configured';
}

function hasRequiredOpenAiConnectorScopes(connector: ConnectorConfig): boolean {
	const required = requiredOpenAiConnectorScopes(connector.connectorId);
	if (required.length === 0 || !connector.oauth) return true;
	const scopes = oauthScopes(connector.oauth);
	if (scopes.size === 0) return true;
	return required.every((scope) => scopes.has(scope));
}

function oauthScopes(oauth: ConnectorOAuthCredential): Set<string> {
	return new Set([
		...(oauth.scope?.split(/\s+/u) ?? []),
		...(oauth.token?.scope?.split(/\s+/u) ?? []),
		...(oauth.scopes ?? []),
	].map((scope) => scope.trim()).filter(Boolean));
}

function authKindFor(connector: ConnectorConfig): ConnectorView['authKind'] {
	if (connector.oauth) return 'oauth';
	if (isOpenAiResponsesConnector(connector)) {
		return connector.serverUrl && !connectorAuthorization(connector) ? 'none' : 'manual_oauth_access_token';
	}
	return 'mcp_env';
}
