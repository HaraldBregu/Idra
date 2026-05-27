import type { ConnectorConfig, ConnectorTool, OpenAiConnectorId } from '../../../shared/connector';

export interface ConnectorRuntimeStrategy {
	readonly connectorId: OpenAiConnectorId;
	listTools(connector: ConnectorConfig): ConnectorTool[];
	callTool(connector: ConnectorConfig, name: string, args: unknown): Promise<unknown>;
}

export type ConnectorToolLister = (connector: ConnectorConfig) => ConnectorTool[];
