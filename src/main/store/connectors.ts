import type { ConnectorConfig } from '../../shared/connector';
import type { SettingsStoreAccessor, StoreSchema } from '../../shared/store';

type ConnectorStoreKey = keyof NonNullable<StoreSchema['connectors']>;

const CONNECTOR_STORE_KEY_BY_ID = {
	connector_gmail: 'google_gmail',
	connector_googlecalendar: 'google_calendar',
	connector_googledrive: 'google_drive',
	connector_microsoftteams: 'microsoft_teams',
	connector_outlookcalendar: 'outlook_calendar',
	connector_outlookemail: 'outlook_email',
	connector_sharepoint: 'sharepoint',
	connector_dropbox: 'dropbox',
} satisfies Record<ConnectorConfig['connectorId'], ConnectorStoreKey>;

const CONNECTOR_STORE_KEYS = Object.values(CONNECTOR_STORE_KEY_BY_ID) as ConnectorStoreKey[];

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function readConnectorSettingsList(value: unknown): ConnectorConfig[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry) => (readRecord(entry) ? [entry as ConnectorConfig] : []));
	}
	const record = readRecord(value);
	if (!record) return [];
	return CONNECTOR_STORE_KEYS.flatMap((key) => {
		const connector = record[key];
		return readRecord(connector) ? [connector as ConnectorConfig] : [];
	});
}

function connectorSettingsByKey(
	connectors: ConnectorConfig[]
): NonNullable<StoreSchema['connectors']> {
	const next: NonNullable<StoreSchema['connectors']> = {};
	for (const connector of connectors) {
		next[CONNECTOR_STORE_KEY_BY_ID[connector.connectorId]] = connector;
	}
	return next;
}

export class ConnectorStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getConnectors(): ConnectorConfig[] {
		return readConnectorSettingsList(this.store.get('connectors'));
	}

	getConnectorById(id: string): ConnectorConfig | undefined {
		return this.getConnectors().find((connector) => connector.id === id);
	}

	setConnectors(connectors: ConnectorConfig[]): void {
		this.store.set('connectors', connectorSettingsByKey(connectors));
	}
}
