import type { ConnectorRecord } from './types';

const LEGACY_OPENAI_CONNECTOR_MIGRATIONS = [{
	connectorId: 'google.gmail',
	serverUrl: 'https://gmailmcp.googleapis.com/mcp/v1',
	nextConnectorId: 'connector_gmail',
	nextServerDescription: 'Read and search Gmail messages through the OpenAI Gmail connector.',
}];

export function migrateLegacyOpenAiConnector(connector: ConnectorRecord): ConnectorRecord {
	const migration = LEGACY_OPENAI_CONNECTOR_MIGRATIONS.find((entry) => {
		return connector.connectorId === entry.connectorId || connector.serverUrl === entry.serverUrl;
	});
	if (!migration) return connector;
	return {
		...connector,
		connectorId: migration.nextConnectorId,
		serverDescription: migration.nextServerDescription,
		serverUrl: undefined,
		allowedTools: [],
		tools: [],
	};
}
