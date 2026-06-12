import type { ConnectorData, ConnectorDefault, ConnectorId } from '../../../shared/connector';

export abstract class Connector {
	abstract readonly id: ConnectorId;
	abstract readonly defaults: ConnectorDefault;

	abstract toSettings(): ConnectorData;
}
