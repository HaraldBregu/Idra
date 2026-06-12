import type { ConnectorData, ConnectorDefault, ConnectorId } from '../../../shared/connector';
import { Connector } from '../core/connector';

export class SimpleConnector extends Connector {
	readonly id: ConnectorId;

	constructor(readonly defaults: ConnectorDefault) {
		super();
		this.id = defaults.id;
	}

	toSettings(): ConnectorData {
		return {
			type: 'mcp',
			server_label: this.defaults.serverLabel,
			server_url: this.defaults.serverUrl,
			server_description: this.defaults.serverDescription,
			require_approval: this.defaults.requireApproval,
			defer_loading: this.defaults.deferLoading,
			enabled: this.defaults.enabled,
		};
	}
}
