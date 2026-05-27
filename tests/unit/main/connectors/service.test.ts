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
import type { ConnectorConfig, ConnectorTool } from '../../../../src/shared/connector';
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

function createService(client = createFakeMcpClient(), options: {
	readonly env?: NodeJS.ProcessEnv;
	readonly openExternalUrl?: (url: string) => Promise<void>;
} = {}) {
	const logger = makeLogger();
	const factory = jest.fn(() => client);
	const service = new ConnectorsService(logger as never, {
		mcpClientFactory: factory,
		env: options.env,
		openExternalUrl: options.openExternalUrl,
	});
	const stores = MockStore.mock.results.slice(-2).map((result) => result.value as {
		data: Map<string, unknown>;
		get: jest.Mock;
		set: jest.Mock;
		delete: jest.Mock;
	});
	const [store, toolStore] = stores;
	return { service, store: store!, toolStore: toolStore!, logger, client, factory };
}

function mcpInput(overrides: Record<string, unknown> = {}) {
	return {
		name: 'Remote Gmail MCP',
		connectorId: 'google.gmail',
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
		connectorId: 'google.gmail',
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

	it('constructs dedicated connector config and tool cache Electron Stores', () => {
		createService();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'connectors',
			accessPropertiesByDotNotation: false,
		});
		expect(MockStore).toHaveBeenCalledWith({
			name: 'connector-tools',
			accessPropertiesByDotNotation: false,
		});
	});

	it('opens Google OAuth through the backend and stores connector auth state in connectors.json', async () => {
		const openExternalUrl = jest.fn(async () => undefined);
		const { service, store } = createService(createFakeMcpClient(), {
			env: { GOOGLE_OAUTH_CLIENT_ID: 'google-client-id' },
			openExternalUrl,
		});

		const result = await service.authorizeOAuth({ connectorId: 'google.gmail' });

		expect(openExternalUrl).toHaveBeenCalledWith(result.authorizationUrl);
		const url = new URL(result.authorizationUrl);
		expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
		expect(url.searchParams.get('client_id')).toBe('google-client-id');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
		expect(store.data.get('connectors')).toEqual([
			expect.objectContaining({
				connectorId: 'google.gmail',
				oauth: expect.objectContaining({
					clientId: 'google-client-id',
					authorizationUrl: result.authorizationUrl,
					state: expect.any(String),
				}),
			}),
		]);
		expect(result.connector.oauth?.token).toBeUndefined();
	});

	it('stores completed OAuth tokens in connectors.json and redacts them from public reads', async () => {
		const { service, store } = createService(createFakeMcpClient(), {
			env: { GOOGLE_OAUTH_CLIENT_ID: 'google-client-id' },
			openExternalUrl: jest.fn(async () => undefined),
		});
		const started = await service.authorizeOAuth({ connectorId: 'google.drive' });
		const state = started.connector.oauth?.state;
		expect(state).toBeTruthy();

		const completed = service.completeOAuth({
			state,
			accessToken: 'access-token',
			refreshToken: 'refresh-token',
			tokenType: 'Bearer',
			scope: 'https://www.googleapis.com/auth/drive.readonly',
			expiresIn: 3600,
			accountEmail: 'user@example.com',
		});

		expect(store.data.get('connectors')).toEqual([
			expect.objectContaining({
				connectorId: 'google.drive',
				oauth: expect.objectContaining({
					accountEmail: 'user@example.com',
					token: expect.objectContaining({
						accessToken: 'access-token',
						refreshToken: 'refresh-token',
						tokenType: 'Bearer',
					}),
				}),
			}),
		]);
		expect(completed.oauth?.token).toMatchObject({ accessToken: '', refreshToken: '' });
		expect(service.list()[0]).toMatchObject({
			authKind: 'oauth',
			status: 'configured',
			connectedAccount: 'user@example.com',
		});
	});

	it('stores dynamic connector records and discovers MCP tools on add', async () => {
		const { service, store, toolStore, client } = createService();

		const added = await service.add(mcpInput());

		expect(client.listTools).toHaveBeenCalledTimes(1);
		expect(store.data.get('connectors')).toEqual([
			expect.objectContaining({
				id: added.id,
				connectorId: 'google.gmail',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
				tools: [],
			}),
		]);
		expect(toolStore.data.get('tools')).toEqual({
			[added.id]: [expect.objectContaining({ name: 'search', requiresApproval: true })],
		});
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

		await expect(service.add({ name: 'Bad', connectorId: 'google.gmail' })).rejects.toThrow(
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
