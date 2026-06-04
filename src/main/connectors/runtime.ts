import type { ConnectorConfigValue, ConnectorRecord } from '../../shared/connectors';

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function connectorAuthorization(connector: ConnectorConfigValue): string {
	return connector.authorization?.trim() ?? '';
}

export function redactConnectorSecrets(connectors: ConnectorRecord): ConnectorRecord {
	return Object.fromEntries(
		Object.entries(connectors).map(([key, connector]) => [
			key,
			{
				...connector,
				authorization: connector.authorization ? '' : undefined,
			},
		])
	);
}
