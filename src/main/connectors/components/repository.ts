import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../../observability';
import {
	GMAIL_CONNECTOR_ID,
	GMAIL_MCP_SERVER_URL,
	GMAIL_TOOLS_WITHOUT_APPROVAL,
	type ConnectorConfig,
	type ConnectorTool,
} from '../../../shared/connector';
import { errorMessage, uniqueStrings } from './runtime';

type ConnectorsStoreSchema = { connectors?: ConnectorConfig[] };
type ConnectorsStore = {
	get(key: 'connectors'): unknown;
	set(key: 'connectors', value: ConnectorConfig[]): void;
};

const CONNECTOR_STORE_KEY = 'connectors';
const DEFAULT_CONNECTOR_STORE_DIR = 'friday';

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
	const legacyGmailNeedsReadDefaults =
		connector.connectorId === GMAIL_CONNECTOR_ID &&
		serverUrl === GMAIL_MCP_SERVER_URL &&
		(connector.requireApproval ?? 'always') === 'always' &&
		(!Array.isArray(connector.allowedTools) || connector.allowedTools.length === 0);
	return {
		...connector,
		serverUrl,
		authorization: typeof connector.authorization === 'string' ? connector.authorization : '',
		allowedTools: legacyGmailNeedsReadDefaults
			? [...GMAIL_TOOLS_WITHOUT_APPROVAL]
			: Array.isArray(connector.allowedTools)
				? uniqueStrings(connector.allowedTools)
				: [],
		requireApproval: legacyGmailNeedsReadDefaults
			? 'never_for_allowed_tools'
			: connector.requireApproval ?? 'always',
		deferLoading: connector.deferLoading ?? false,
		enabled: connector.enabled ?? true,
		tools: Array.isArray(connector.tools) ? connector.tools.map(normalizeStoredTool) : [],
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
