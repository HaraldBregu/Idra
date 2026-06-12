import { CONNECTOR_DEFAULTS, type ConnectorDefault } from '@shared/connector';

export type SettingsConnectorCatalogEntry = ConnectorDefault & {
	readonly directConnectorId: ConnectorDefault['id'];
};

export const SETTINGS_CONNECTOR_CATALOG: readonly SettingsConnectorCatalogEntry[] =
	CONNECTOR_DEFAULTS.map((entry) => ({
		...entry,
		directConnectorId: entry.id,
	}));
