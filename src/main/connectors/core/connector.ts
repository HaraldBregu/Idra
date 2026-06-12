import type {
	ConnectorDefault,
	ConnectorId,
	ConnectorSettingsEntry,
} from '../../../shared/connector';

export abstract class Connector {
	abstract readonly id: ConnectorId;
	abstract readonly defaults: ConnectorDefault;

	abstract toSettings(): ConnectorSettingsEntry;
}
