import type { ConnectorRecord } from '../../../../src/shared/connectors';

let mockStoreData: unknown = {};
const mockStore = {
	get store(): unknown {
		return mockStoreData;
	},
	set store(value: ConnectorRecord) {
		mockStoreData = value;
	},
};

jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => mockStore);
});

import { ConnectorsService } from '../../../../src/main/connectors';

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('ConnectorsService storage', () => {
	beforeEach(() => {
		mockStoreData = {};
		logger.info.mockClear();
		logger.warn.mockClear();
		logger.error.mockClear();
	});

	it('stores authorized connectors as MCP store entries', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const [saved] = await service.save([{
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			serverDescription: 'Acme mail connector.',
			serverUrl: 'https://mcp.example.com/mail',
			authorization: 'token-123',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		}]);

		expect(saved.authorization).toBe('');
		expect(saved.tools).toEqual([]);
		expect((mockStoreData as ConnectorRecord).acme_mail).toEqual({
			type: 'mcp',
			server_label: 'acme_mail',
			server_url: 'https://mcp.example.com/mail',
			authorization: 'token-123',
			require_approval: 'never',
			allowed_tools: ['search_emails'],
		});
		expect(service.get(saved.id).authorization).toBe('');
		expect(service.getConnectorSettings()[0].authorization).toBe('');
		expect(service.list()[0]).toMatchObject({
			status: 'configured',
			authKind: 'manual_oauth_access_token',
		});
	});

	it('only stores authorized connector records in bulk', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const saved = await service.save([
			{
				name: 'Acme Mail',
				connectorId: 'connector_acme_mail',
				serverLabel: 'acme_mail',
				serverUrl: 'https://mcp.example.com/mail',
				authorization: 'token-123',
			},
			{
				name: 'Acme MCP',
				connectorId: 'acme_remote_mcp',
				serverLabel: 'acme',
				serverUrl: 'https://mcp.example.com/sse',
			},
		]);

		expect(saved).toHaveLength(1);
		expect(saved.every((connector) => connector.authorization === '')).toBe(true);
		expect(mockStoreData).toEqual({
			acme_mail: {
				type: 'mcp',
				server_label: 'acme_mail',
				server_url: 'https://mcp.example.com/mail',
				authorization: 'token-123',
			},
		});
	});

	it('rejects non-array bulk connector saves', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await expect(service.save({ connectors: [] })).rejects.toThrow(
			'Connector settings must be an array.'
		);
	});

	it('does not store connector settings without authorization', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.save([{
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
		}]);

		expect(service.list()).toEqual([]);
		expect(mockStoreData).toEqual({});
	});

	it('rejects authorized connector settings without serverUrl', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await expect(service.save([{
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			authorization: 'token-123',
		}])).rejects.toThrow('Connector serverUrl is required before storing Acme Mail.');
	});

	it('reads MCP connector entries from the Electron connectors store', () => {
		const service = new ConnectorsService(logger as never, { env: {} });
		mockStoreData = {
			gmail: {
				type: 'mcp',
				server_label: 'my-server',
				server_url: 'https://example.com/mcp',
				authorization: 'Bearer token-123',
				require_approval: 'never',
				allowed_tools: ['search', 'fetch'],
			},
			google_calendar: {
				type: 'mcp',
				server_label: 'calendar',
				server_url: 'https://calendar.example.com/mcp',
				authorization: 'Bearer calendar-token',
			},
		};

		expect(service.list()).toEqual([
			expect.objectContaining({
				id: 'gmail',
				serverLabel: 'my-server',
				serverUrl: 'https://example.com/mcp',
				status: 'configured',
				requireApproval: 'never',
				allowedToolsCount: 2,
			}),
			expect.objectContaining({
				id: 'google_calendar',
				serverLabel: 'calendar',
				serverUrl: 'https://calendar.example.com/mcp',
				status: 'configured',
				requireApproval: 'always',
			}),
		]);
	});

});
