import { ConnectorService } from '../../../../src/main/services/connector-service';
import type { ConnectorSettingsRecord } from '../../../../src/shared/connector';

class MemoryConnectorStore {
	private state = {
		connectors: {},
	} as { connectors: ConnectorSettingsRecord };

	get store(): unknown {
		return this.state;
	}

	set store(value: { connectors: ConnectorSettingsRecord }) {
		this.state = value;
	}

	get(key: 'connectors'): unknown {
		return this.state[key];
	}

	set(key: 'connectors', value: ConnectorSettingsRecord): void {
		this.state = {
			...this.state,
			[key]: value,
		};
	}
}

describe('ConnectorService', () => {
	it('starts with no configured connectors', () => {
		const service = new ConnectorService({ store: new MemoryConnectorStore() });

		expect(service.list()).toEqual({});
	});

	it('stores supported connector settings by connector id', () => {
		const service = new ConnectorService({ store: new MemoryConnectorStore() });

		const result = service.upsert({
			id: 'gmail',
			name: 'Gmail',
			connectorId: 'connector_gmail',
			authorization: ' token ',
		});

		expect(Object.keys(service.list())).toEqual(['gmail']);
		expect(result.gmail).toEqual(
			expect.objectContaining({
				type: 'mcp',
				server_label: 'gmail',
				server_url: 'https://gmailmcp.googleapis.com/mcp/v1',
				authorization: 'token',
				enabled: true,
			})
		);
		expect(result.gmail?.created_at).toBeDefined();
		expect(result.gmail?.updated_at).toBeDefined();
	});

	it('resolves connector ids from catalog connector ids', () => {
		const service = new ConnectorService({ store: new MemoryConnectorStore() });

		service.upsert({
			name: 'Calendar',
			connectorId: 'connector_calendar',
		});

		expect(service.get('calendar').calendar).toEqual(
			expect.objectContaining({
				server_label: 'calendar',
				server_url: 'https://www.googleapis.com/calendar/v3',
			})
		);
	});

	it('rejects unsupported connectors', () => {
		const service = new ConnectorService({ store: new MemoryConnectorStore() });

		expect(() =>
			service.upsert({
				id: 'drive',
				name: 'Drive',
				connectorId: 'connector_drive',
			})
		).toThrow('Unsupported connector: drive');
	});
});
