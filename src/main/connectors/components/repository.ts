import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../../observability';
import {
	connectorsFromStore,
	connectorsToStore,
	type ConnectorConfig,
	type ConnectorStore,
} from '../../../shared/connector';
import { errorMessage } from './runtime';

type ConnectorsStoreSchema = { connectors?: ConnectorStore };
type ConnectorsStore = {
	get(key: 'connectors'): unknown;
	set(key: 'connectors', value: ConnectorStore): void;
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
			const connectors = connectorsFromStore(raw);
			if (connectors.length === 0 && !isEmptyConnectorStore(raw)) {
				this.warn('Dropped invalid connector settings', { key: CONNECTOR_STORE_KEY });
			}
			return connectors;
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
		this.store.set(CONNECTOR_STORE_KEY, connectorsToStore(connectors));
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

function isEmptyConnectorStore(value: unknown): boolean {
	return Boolean(value && typeof value === 'object' && Object.keys(value).length === 0);
}
