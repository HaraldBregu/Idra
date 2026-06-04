import type { ConnectorConfig, ConnectorStore } from '../../../../src/shared/connector';

const mockStoreData: { connectors?: unknown } = {};
const mockStore = {
	get: jest.fn((key: 'connectors') => mockStoreData[key]),
	set: jest.fn((key: 'connectors', value: ConnectorStore) => {
		mockStoreData[key] = value;
	}),
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
		mockStoreData.connectors = undefined;
		mockStore.get.mockClear();
		mockStore.set.mockClear();
		logger.info.mockClear();
		logger.warn.mockClear();
		logger.error.mockClear();
	});

	it('stores and redacts authorization without MCP transport', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const [saved] = await service.save([{
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			serverDescription: 'Acme mail connector.',
			authorization: 'token-123',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		}]);

		expect(saved.authorization).toBe('');
		expect(saved.tools).toEqual([]);
		expect((mockStoreData.connectors as ConnectorStore).acme_mail.authorization).toBe('token-123');
		expect((mockStoreData.connectors as ConnectorStore).acme_mail.tools).toEqual([]);
		expect(service.get(saved.id).authorization).toBe('');
		expect(service.getConnectorSettings()[0].authorization).toBe('');
		expect(service.list()[0]).toMatchObject({
			status: 'configured',
			authKind: 'manual_oauth_access_token',
		});
	});

	it('saves connector records in bulk through the connectors store', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const saved = await service.save([
			{
				name: 'Acme Mail',
				connectorId: 'connector_acme_mail',
				serverLabel: 'acme_mail',
				authorization: 'token-123',
			},
			{
				name: 'Acme MCP',
				connectorId: 'acme_remote_mcp',
				serverLabel: 'acme',
				serverUrl: 'https://mcp.example.com/sse',
			},
		]);

		expect(saved).toHaveLength(2);
		expect(saved.every((connector) => connector.authorization === '')).toBe(true);
		expect(Object.values(mockStoreData.connectors as ConnectorStore).map((connector) => connector.authorization)).toEqual([
			'token-123',
			'',
		]);
	});

	it('rejects non-array bulk connector saves', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await expect(service.save({ connectors: [] })).rejects.toThrow(
			'Connector settings must be an array.'
		);
	});

	it('reports missing_auth when authorization is absent', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.save([{
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
		}]);

		expect(service.list()[0].status).toBe('missing_auth');
	});

	it('reports missing_auth for migrated Gmail OAuth tokens without the OpenAI connector scope', () => {
		const service = new ConnectorsService(logger as never, { env: {} });
		const now = new Date().toISOString();
		mockStoreData.connectors = [{
			id: 'gmail-1',
			name: 'Gmail',
			connectorId: 'google.gmail',
			serverLabel: 'gmail',
			serverUrl: 'https://gmailmcp.googleapis.com/mcp/v1',
			enabled: true,
			authorization: 'token-123',
			oauth: {
				service: 'google',
				scopes: [
					'openid',
					'email',
					'https://www.googleapis.com/auth/gmail.readonly',
					'https://www.googleapis.com/auth/gmail.compose',
				],
				token: {
					accessToken: 'token-123',
					scope: 'openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose',
				},
			},
			requireApproval: 'always',
			allowedTools: [],
			deferLoading: false,
			tools: [],
			createdAt: now,
			updatedAt: now,
		}];

		expect(service.list()[0]).toMatchObject({
			connectorId: 'connector_gmail',
			serverUrl: undefined,
			status: 'missing_auth',
		});
	});
});
