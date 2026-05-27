jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			data,
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			delete: (key: string) => {
				data.delete(key);
			},
		};
	});
});

import Store from 'electron-store';
import { ConnectorsService } from '../../../../src/main/agent/connectors';
import type { ConnectorConfig, ConnectorTool } from '../../../../src/shared/connectors';
import { makeLogger } from '../test-helpers';

const MockStore = Store as jest.MockedClass<typeof Store>;

const discoveredTools: ConnectorTool[] = [
	{
		name: 'search',
		description: 'Search the connected service.',
		inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
		requiresApproval: false,
	},
	{
		name: 'write_note',
		description: 'Write a note.',
		inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
		requiresApproval: false,
	},
];

function createFakeMcpClient(tools = discoveredTools) {
	return {
		listTools: jest.fn(async () => tools),
		callTool: jest.fn(async (name: string, args: Record<string, unknown>) => ({ name, args })),
		close: jest.fn(async () => undefined),
	};
}

function createService(client = createFakeMcpClient()) {
	const logger = makeLogger();
	const factory = jest.fn(() => client);
	const service = new ConnectorsService(logger as never, { mcpClientFactory: factory });
	const store = MockStore.mock.results[MockStore.mock.results.length - 1]?.value as {
		data: Map<string, unknown>;
		get: jest.Mock;
		set: jest.Mock;
		delete: jest.Mock;
	};
	return { service, store, logger, client, factory };
}

function mcpInput(overrides: Record<string, unknown> = {}) {
	return {
		name: 'Remote Gmail MCP',
		connectorId: 'connector_gmail',
		serverLabel: 'gmail_mcp',
		allowedTools: ['search'],
		mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
		...overrides,
	};
}

function storedConnector(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
	return {
		id: 'connector-1',
		name: 'Remote Gmail MCP',
		connectorId: 'connector_gmail',
		serverLabel: 'gmail_mcp',
		enabled: true,
		authorization: '',
		requireApproval: 'always',
		allowedTools: ['search'],
		deferLoading: false,
		tools: discoveredTools.slice(0, 1),
		mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
		createdAt: '2026-05-22T00:00:00.000Z',
		updatedAt: '2026-05-22T00:00:00.000Z',
		...overrides,
	};
}

describe('ConnectorsService MCP persistence', () => {
	beforeEach(() => {
		MockStore.mockClear();
		delete process.env.REMOTE_MCP_API_KEY;
	});

	it('constructs a dedicated connector Electron Store', () => {
		createService();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'connector',
			accessPropertiesByDotNotation: false,
		});
	});

	it('stores dynamic connector records and discovers MCP tools on add', async () => {
		const { service, store, client } = createService();

		const added = await service.add(mcpInput());

		expect(client.listTools).toHaveBeenCalledTimes(1);
		expect(store.data.get('connectors')).toEqual([
			expect.objectContaining({
				id: added.id,
				connectorId: 'connector_gmail',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
				tools: [expect.objectContaining({ name: 'search', requiresApproval: true })],
			}),
		]);
		expect(added.authorization).toBe('');
		expect(service.list()).toEqual([
			expect.objectContaining({ name: 'Remote Gmail MCP', status: 'configured', toolsCount: 1 }),
		]);
	});

	it('allows multiple connector instances for the same provider id', async () => {
		const { service } = createService();

		const first = await service.add(mcpInput({ name: 'Work Gmail', serverLabel: 'work_gmail' }));
		const second = await service.add(mcpInput({ name: 'Personal Gmail', serverLabel: 'personal_gmail' }));

		expect(first.id).not.toBe(second.id);
		expect(service.list().map((connector) => connector.name)).toEqual(['Work Gmail', 'Personal Gmail']);
	});

	it('validates MCP config and rejects stored authorization secrets', async () => {
		const { service, logger } = createService();

		await expect(service.add({ name: 'Bad', connectorId: 'connector_gmail' })).rejects.toThrow(
			/MCP transport configuration is required/
		);
		await expect(service.add(mcpInput({ authorization: 'token' }))).rejects.toThrow(
			/environment variables/
		);
		await expect(
			service.add(mcpInput({ mcp: { transport: 'http', url: 'https://mcp.example.test/mcp', headers: { Authorization: 'token' } } }))
		).rejects.toThrow(/secret headers/);
		expect(logger.warn).toHaveBeenCalledWith(
			'ConnectorsService',
			'Connector validation failed',
			expect.objectContaining({ action: 'add' })
		);
	});

	it('reports missing MCP secret environment variables without storing secret values', async () => {
		const { service, client } = createService();

		const added = await service.add(
			mcpInput({
				mcp: {
					transport: 'http',
					url: 'https://mcp.example.test/mcp',
					auth: { env: 'REMOTE_MCP_API_KEY' },
				},
			})
		);

		expect(client.listTools).not.toHaveBeenCalled();
		expect(service.list()[0]).toMatchObject({ status: 'missing_auth' });
		await expect(service.refreshTools(added.id)).rejects.toThrow('REMOTE_MCP_API_KEY');
		expect(service.get(added.id).mcp).toMatchObject({ auth: { env: 'REMOTE_MCP_API_KEY' } });
	});

	it('calls dynamically discovered MCP tools and exposes them to the agent', async () => {
		const { service, client } = createService();
		const added = await service.add(
			mcpInput({ allowedTools: ['search'], requireApproval: 'never_for_allowed_tools' })
		);

		await expect(service.callTool(added.id, 'search', { query: 'roadmap' })).resolves.toEqual({
			name: 'search',
			args: { query: 'roadmap' },
		});
		expect(client.callTool).toHaveBeenCalledWith('search', { query: 'roadmap' }, undefined);

		const tools = service.createAgentTools();
		expect(tools.map((tool) => tool.name)).toEqual(['gmail_mcp_search']);
		await expect(tools[0]!.execute({ query: 'roadmap' }, {} as never)).resolves.toMatchObject({
			status: 'ok',
			content: [expect.objectContaining({ text: expect.stringContaining('roadmap') })],
		});
	});

	it('contains MCP discovery failures in connector state', async () => {
		const client = createFakeMcpClient();
		client.listTools.mockRejectedValue(new Error('server down'));
		const { service } = createService(client);

		const added = await service.add(mcpInput());

		expect(service.list()[0]).toMatchObject({ status: 'error', lastError: 'server down' });
		expect(await service.test(added.id)).toMatchObject({ status: 'error', message: 'server down' });
	});

	it('drops invalid stored records and logs persistence failures', async () => {
		const { service, store, logger } = createService();
		store.data.set('connectors', [{ id: 'connector-1' }]);

		expect(service.list()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'ConnectorsService',
			'Dropped invalid connector settings',
			expect.objectContaining({ key: 'connectors' })
		);

		store.get = jest.fn(() => {
			throw new Error('read failed');
		});
		expect(() => service.list()).toThrow('read failed');
		expect(logger.error).toHaveBeenCalledWith(
			'ConnectorsService',
			'Failed to read connector settings',
			expect.objectContaining({ key: 'connectors', error: 'read failed' })
		);
	});

	it('validates connector tool-call arguments and options', async () => {
		const { service } = createService();
		const connector = await service.add(mcpInput());

		await expect(service.callTool(connector.id, 'search', 'bad')).rejects.toThrow(
			'Connector tool arguments must be an object.'
		);
		await expect(service.callTool(connector.id, 'search', {}, { timeoutMs: -1 })).rejects.toThrow(
			'Connector tool option timeoutMs must be a non-negative integer.'
		);
		await expect(service.callTool(123 as unknown as string, 'search', {})).rejects.toThrow(
			'Connector id must be a string.'
		);
	});
});
