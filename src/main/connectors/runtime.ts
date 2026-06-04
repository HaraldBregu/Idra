import {
	type Connector,
	type ConnectorStatus,
	type ConnectorView,
} from '../../shared/connectors';

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function isOpenAiConnectorIdConfig(connector: Pick<Connector, 'serverUrl'>): boolean {
	return !connector.serverUrl;
}

export function connectorAuthorization(connector: Connector): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

export function redactConnectorSecrets(connector: Connector): Connector {
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

export function toConnectorView(connector: Connector): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		authKind: authKindFor(connector),
		serverLabel: connector.serverLabel,
		serverUrl: connector.serverUrl,
		enabled: connector.enabled,
		status: toConnectorStatus(connector),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
		connectedAccount: connector.oauth?.accountEmail ?? connector.oauth?.email,
	};
}

export function toConnectorStatus(connector: Connector): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (isOpenAiConnectorIdConfig(connector) && !connectorAuthorization(connector)) return 'missing_auth';
	if (connector.oauth && !connector.oauth.token?.accessToken && !connector.oauth.token?.refreshToken) {
		return 'missing_auth';
	}
	return 'configured';
}

function authKindFor(connector: Connector): ConnectorView['authKind'] {
	if (connector.oauth) return 'oauth';
	return connector.serverUrl && !connectorAuthorization(connector) ? 'none' : 'manual_oauth_access_token';
}
