import type { ConnectorStore } from '../../../../src/shared/connector';

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
import { ConnectorToolsService } from '../../../../src/main/connector-tools';
import { ToolService } from '../../../../src/main/tools';

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

describe('ToolService connector built-ins', () => {
	beforeEach(() => {
		mockStoreData.connectors = undefined;
		mockStore.get.mockClear();
		mockStore.set.mockClear();
		logger.info.mockClear();
		logger.warn.mockClear();
		logger.error.mockClear();
	});

	it('passes stored MCP connectors as provider tool specs', () => {
		mockStoreData.connectors = {
			dmcp: {
				type: 'mcp',
				server_label: 'dmcp',
				server_description: 'A Dungeons and Dragons MCP server to assist with dice rolling.',
				server_url: 'https://dmcp-server.deno.dev/sse',
				authorization: 'Bearer token-123',
				require_approval: 'never',
				allowed_tools: ['roll'],
			},
		};
		const connectors = new ConnectorsService(logger as never, { env: {} });
		const connectorTools = new ConnectorToolsService(connectors, { env: {} });
		const service = new ToolService({ connectorTools });

		expect(service.createBuiltInToolsForProvider('openai')).toEqual([
			{
				type: 'mcp',
				server_label: 'dmcp',
				server_description: 'A Dungeons and Dragons MCP server to assist with dice rolling.',
				server_url: 'https://dmcp-server.deno.dev/sse',
				authorization: 'Bearer token-123',
				require_approval: 'never',
				allowed_tools: ['roll'],
			},
		]);
	});
});
