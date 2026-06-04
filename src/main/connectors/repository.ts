import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { LoggerService } from '../observability';
import type { ConnectorRecord } from '../../shared/connectors';
import { errorMessage } from './runtime';
import { connectorsFromStore, connectorsToStore } from './storage';

type ConnectorsStore = {
	get store(): unknown;
	set store(value: ConnectorRecord);
};

const DEFAULT_CONNECTOR_STORE_DIR = 'friday';

export class ConnectorRepository {
	private readonly store: ConnectorsStore;

	constructor(private readonly logger: LoggerService) {
		this.store = new Store<ConnectorRecord>({
			name: 'connectors',
			cwd: path.join(resolveAppDataPath(), DEFAULT_CONNECTOR_STORE_DIR),
			accessPropertiesByDotNotation: false,
		}) as unknown as ConnectorsStore;
	}

	list(): ConnectorRecord {
		try {
			const raw = this.store.store;
			const connectors = connectorsFromStore(raw);
			if (Object.keys(connectors).length === 0 && !isEmptyConnectorStore(raw)) {
				this.warn('Dropped invalid connector settings');
			}
			return connectors;
		} catch (error) {
			this.logger.error('ConnectorsService', 'Failed to read connector settings', {
				error: errorMessage(error),
			});
			throw error;
		}
	}

	get(id: string): ConnectorRecord {
		const connectors = this.list();
		const connector = connectors[id];
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return { [id]: connector };
	}

	write(connectors: ConnectorRecord): void {
		this.store.store = connectorsToStore(connectors);
	}

	replace(connector: ConnectorRecord): void {
		this.write({ ...this.list(), ...connector });
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
