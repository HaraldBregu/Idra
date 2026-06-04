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
import { ConnectorToolsService } from '../../../../src/main/connector-tools';

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('ConnectorToolsService provider adapters', () => {
	beforeEach(() => {
		mockStoreData.connectors = undefined;
		mockStore.get.mockClear();
		mockStore.set.mockClear();
		logger.info.mockClear();
		logger.warn.mockClear();
		logger.error.mockClear();
	});

	it('builds OpenAI MCP tool specs from stored connector records', async () => {
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });

		await connectors.save([{
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			serverDescription: 'Acme mail connector.',
			authorization: 'token-123',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		}]);

		expect(connectorTools.createOpenAIConnectorTools()).toEqual([
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
		expect(connectors.getConnectorSettings()[0].authorization).toBe('');
	});

	it('omits OpenAI connector built-ins when authorization is absent', async () => {
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });

		await connectors.save([{
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
		}]);

		expect(connectorTools.createOpenAIConnectorTools()).toEqual([]);
	});

	it('maps OpenAI connector approval modes', async () => {
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });

		await connectors.save([{
			name: 'Acme Drive',
			connectorId: 'connector_acme_drive',
			serverLabel: 'acme_drive',
			authorization: 'acme-drive-token',
			requireApproval: 'always',
		}, {
			name: 'Acme Calendar',
			connectorId: 'connector_acme_calendar',
			serverLabel: 'acme_calendar',
			authorization: 'calendar-token',
			requireApproval: 'never',
		}]);

		expect(connectorTools.createOpenAIConnectorTools().map((tool) => tool.require_approval)).toEqual([
			'always',
			'never',
		]);
	});

	it('builds OpenAI remote MCP tool specs from connector records with serverUrl', async () => {
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });

		await connectors.save([{
			name: 'Acme MCP',
			connectorId: 'acme_remote_mcp',
			serverLabel: 'acme',
			serverUrl: 'https://mcp.example.com/sse',
			authorization: 'mcp-token',
			requireApproval: 'never',
			allowedTools: ['search'],
		}]);

		expect(connectors.list()[0]).toMatchObject({
			status: 'configured',
			authKind: 'manual_oauth_access_token',
		});
		expect(connectorTools.createOpenAIConnectorTools()).toEqual([
			{
				type: 'mcp',
				server_label: 'acme',
				server_url: 'https://mcp.example.com/sse',
				authorization: 'mcp-token',
				require_approval: 'never',
				allowed_tools: ['search'],
			},
		]);
	});

	it('keeps Anthropic connector tools separate from OpenAI built-ins', async () => {
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });

		await connectors.save([{
			name: 'Acme Mail',
			connectorId: 'connector_acme_mail',
			serverLabel: 'acme_mail',
			authorization: 'token-123',
		}]);

		expect(connectorTools.createAnthropicConnectorTools()).toEqual([]);
		expect(connectorTools.createBuiltInConnectorTools('anthropic')).toEqual([]);
		expect(connectorTools.createBuiltInConnectorTools('openai')).toHaveLength(1);
	});
});
