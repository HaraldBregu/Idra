import type { ConnectorConfig } from '../../../../src/shared/connector';

const mockStoreData: { connectors?: unknown } = {};
const mockStore = {
	get: jest.fn((key: 'connectors') => mockStoreData[key]),
	set: jest.fn((key: 'connectors', value: ConnectorConfig[]) => {
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

describe('ConnectorsService OpenAI connectors', () => {
	beforeEach(() => {
		mockStoreData.connectors = undefined;
		mockStore.get.mockClear();
		mockStore.set.mockClear();
		logger.info.mockClear();
		logger.warn.mockClear();
		logger.error.mockClear();
	});

	it('uses the OpenAI provider connector catalog', () => {
		const service = new ConnectorsService(logger as never, { env: {} });
		const ids = service.catalog().map((connector) => connector.id);

		expect(ids).toContain('connector_gmail');
		expect(ids).toContain('connector_dropbox');
		expect(ids).toContain('connector_googlecalendar');
		expect(ids).not.toContain('google.gmail');
	});

	it('stores and redacts authorization for OpenAI connector configs without MCP transport', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const saved = await service.add({
			name: 'Gmail',
			connectorId: 'connector_gmail',
			serverLabel: 'gmail',
			authorization: 'token-123',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		});

		expect(saved.authorization).toBe('');
		expect((mockStoreData.connectors as ConnectorConfig[])[0].authorization).toBe('token-123');
		expect(service.get(saved.id).authorization).toBe('');
		expect(service.getConnectorSettings()[0].authorization).toBe('');
		expect(service.list()[0]).toMatchObject({ status: 'configured', authKind: 'google_oauth' });
		expect(service.createOpenAIConnectorTools()).toEqual([
			{
				type: 'mcp',
				server_label: 'gmail',
				connector_id: 'connector_gmail',
				authorization: 'token-123',
				require_approval: { never: { tool_names: ['search_emails'] } },
				allowed_tools: ['search_emails'],
				server_description: 'Search, read, draft, send, and manage Gmail messages.',
			},
		]);
	});

	it('reports missing_auth and omits OpenAI built-ins when authorization is absent', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Dropbox',
			connectorId: 'connector_dropbox',
			serverLabel: 'dropbox',
		});

		expect(service.list()[0].status).toBe('missing_auth');
		expect(service.createOpenAIConnectorTools()).toEqual([]);
	});

	it('maps OpenAI connector approval modes', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Dropbox',
			connectorId: 'connector_dropbox',
			serverLabel: 'dropbox',
			authorization: 'dropbox-token',
			requireApproval: 'always',
		});
		await service.add({
			name: 'Calendar',
			connectorId: 'connector_googlecalendar',
			serverLabel: 'calendar',
			authorization: 'calendar-token',
			requireApproval: 'never',
		});

		expect(service.createOpenAIConnectorTools().map((tool) => tool.require_approval)).toEqual([
			'always',
			'never',
		]);
	});
});
