import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../../observability';
import type { ConnectorConfig, ConnectorTool } from '../../../shared/connector';
import { errorMessage, uniqueStrings } from './runtime';

type ConnectorsStoreSchema = { connectors?: ConnectorConfig[] };
type ConnectorsStore = {
	get(key: 'connectors'): unknown;
	set(key: 'connectors', value: ConnectorConfig[]): void;
};

const CONNECTOR_STORE_KEY = 'connectors';
const DEFAULT_CONNECTOR_STORE_DIR = 'friday';
const LEGACY_GMAIL_CONNECTOR_ID = 'google.gmail';
const OPENAI_GMAIL_CONNECTOR_ID = 'connector_gmail';
const LEGACY_GMAIL_SERVER_URL = 'https://gmailmcp.googleapis.com/mcp/v1';

export class ConnectorRepository {
	private readonly store: ConnectorsStore;

	constructor(private readonly logger: LoggerService) {
		this.store = new Store<ConnectorsStoreSchema>({
			name: 'connectors',
			cwd: path.join(resolveAppDataPath(), DEFAULT_CONNECTOR_STORE_DIR),
			accessPropertiesByDotNotation: false,
		}) as unknown as ConnectorsStore;
	}

	list(): ConnectorConfig[] {
		try {
			const raw = this.store.get(CONNECTOR_STORE_KEY);
			if (raw === undefined) return [];
			if (!Array.isArray(raw)) {
				this.warn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY });
				return [];
			}
			const valid = raw.filter(isStoredConnectorValid).map(normalizeStoredConnector);
			if (valid.length !== raw.length) {
				this.warn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY });
			}
			return valid;
		} catch (error) {
			this.logger.error('ConnectorsService', 'Failed to read connector settings', {
				key: CONNECTOR_STORE_KEY,
				error: errorMessage(error),
			});
			throw error;
		}
	}

	get(id: string): ConnectorConfig {
		const connector = this.list().find((item) => item.id === id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	write(connectors: ConnectorConfig[]): void {
		this.store.set(CONNECTOR_STORE_KEY, connectors);
	}

	replace(connector: ConnectorConfig): void {
		this.write(this.list().map((item) => (item.id === connector.id ? connector : item)));
	}

	private warn(message: string, details?: Record<string, unknown>): void {
		this.logger.warn('ConnectorsService', message, details);
	}
}

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return process.env.HOME ?? process.cwd();
	}
}

function isStoredConnectorValid(value: unknown): value is ConnectorConfig {
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

function migrateLegacyOpenAiConnector(connector: ConnectorConfig): ConnectorConfig {
	if (
		connector.connectorId !== LEGACY_GMAIL_CONNECTOR_ID &&
		connector.serverUrl !== LEGACY_GMAIL_SERVER_URL
	) {
		return connector;
	}

	return {
		...connector,
		connectorId: OPENAI_GMAIL_CONNECTOR_ID,
		serverDescription: 'Read and search Gmail messages through the OpenAI Gmail connector.',
		serverUrl: undefined,
		allowedTools: [],
		tools: [],
	};
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
