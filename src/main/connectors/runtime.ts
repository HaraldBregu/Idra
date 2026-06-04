import type { ConnectorRecord } from '../../shared/connectors';

type ConnectorEntry = ConnectorRecord[string];

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function uniqueStrings(values: readonly string[]): string[] {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function connectorAuthorization(connector: ConnectorEntry): string {
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
