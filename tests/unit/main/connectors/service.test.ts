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

	it('does not expose a hard-coded OpenAI provider connector catalog', () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		expect(service.catalog()).toEqual([]);
	});

	it('stores and redacts authorization for OpenAI connector configs without MCP transport', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		const saved = await service.add({
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			serverDescription: 'Acme mail connector.',
			authorization: 'token-123',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		});

		expect(saved.authorization).toBe('');
		expect((mockStoreData.connectors as ConnectorConfig[])[0].authorization).toBe('token-123');
		expect(service.get(saved.id).authorization).toBe('');
		expect(service.getConnectorSettings()[0].authorization).toBe('');
		expect(service.list()[0]).toMatchObject({
			status: 'configured',
			authKind: 'manual_oauth_access_token',
		});
		expect(service.createOpenAIConnectorTools()).toEqual([
			{
				type: 'mcp',
				server_label: 'acme_mail',
				connector_id: 'connector_acme_mail',
				authorization: 'token-123',
				require_approval: { never: { tool_names: ['search_emails'] } },
				allowed_tools: ['search_emails'],
				server_description: 'Acme mail connector.',
			},
		]);
	});

	it('reports missing_auth and omits OpenAI built-ins when authorization is absent', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
		});

		expect(service.list()[0].status).toBe('missing_auth');
		expect(service.createOpenAIConnectorTools()).toEqual([]);
	});

	it('maps OpenAI connector approval modes', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
			authorization: 'acme-drive-token',
			requireApproval: 'always',
		});
		await service.add({
			name: 'Acme Calendar',
			connectorId: 'connector_acme_calendar',
			serverLabel: 'acme_calendar',
			authorization: 'calendar-token',
			requireApproval: 'never',
		});

		expect(service.createOpenAIConnectorTools().map((tool) => tool.require_approval)).toEqual([
			'always',
			'never',
		]);
	});

	it('builds OpenAI remote MCP tool specs from connector records with serverUrl', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Acme MCP',
			connectorId: 'acme_remote_mcp',
			serverLabel: 'acme',
			serverUrl: 'https://mcp.example.com/sse',
			requireApproval: 'never',
			allowedTools: ['search'],
		});

		expect(service.list()[0]).toMatchObject({ status: 'configured', authKind: 'none' });
		expect(service.createOpenAIConnectorTools()).toEqual([
			{
				type: 'mcp',
				server_label: 'acme',
				server_url: 'https://mcp.example.com/sse',
				require_approval: 'never',
				allowed_tools: ['search'],
			},
		]);
	});

	it('does not expose OpenAI MCP built-ins through the Anthropic adapter', async () => {
		const service = new ConnectorsService(logger as never, { env: {} });

		await service.add({
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			authorization: 'token-123',
		});

		expect(service.createAnthropicConnectorTools()).toEqual([]);
		expect(service.createBuiltInConnectorTools('anthropic')).toEqual([]);
		expect(service.createBuiltInConnectorTools('openai')).toHaveLength(1);
	});
});
