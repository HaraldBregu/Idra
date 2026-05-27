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
import { ConnectorsService } from '../../../../src/main/connectors';
import type { ConnectorTool } from '../../../../src/shared/connector';
import { makeLogger } from '../test-helpers';

const MockStore = Store as jest.MockedClass<typeof Store>;

const discoveredTools: ConnectorTool[] = [
	{
		name: 'search',
		description: 'Search the connected service.',
		inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
		permission: 'always-allow',
		requiresApproval: false,
	},
	{
		name: 'write_note',
		description: 'Write a note.',
		inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
		permission: 'always-allow',
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
	const stores = MockStore.mock.results.slice(-1).map((result) => result.value as {
		data: Map<string, unknown>;
		get: jest.Mock;
		set: jest.Mock;
		delete: jest.Mock;
	});
	const [store] = stores;
	return { service, store: store!, logger, client, factory };
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

describe('ConnectorsService MCP persistence', () => {
	beforeEach(() => {
		MockStore.mockClear();
		delete process.env.REMOTE_MCP_API_KEY;
	});

	it('constructs the connector config Electron Store under app data', () => {
		createService();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'connectors',
			cwd: '/tmp/friday-test/appData/friday',
			accessPropertiesByDotNotation: false,
		});
		expect(MockStore).toHaveBeenCalledTimes(1);
	});

	it('opens Google OAuth through the backend and stores only MCP config plus fetched tools', async () => {
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
			{
				mcp: {
					transport: 'http',
					url: 'https://gmailmcp.googleapis.com/mcp/v1',
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
					},
				},
				tools: discoveredTools.map((tool) => expect.objectContaining({
					name: tool.name,
					permission: 'always-allow',
					requiresApproval: false,
				})),
			},
		]);
		expect(result.connector.oauth).toEqual(expect.objectContaining({
			clientId: 'google-client-id',
			authorizationUrl: result.authorizationUrl,
			state: expect.any(String),
		}));
		expect(result.connector.oauth?.token).toBeUndefined();
	});

	it('stores Calendar MCP setup and fetched tools in connectors.json', async () => {
		const { service, store } = createService(createFakeMcpClient(), {
			env: { GOOGLE_OAUTH_CLIENT_ID: 'google-client-id' },
			openExternalUrl: jest.fn(async () => undefined),
		});

		await service.authorizeOAuth({ connectorId: 'google.calendar' });

		expect(store.data.get('connectors')).toEqual([
			{
				mcp: {
					transport: 'http',
					url: 'https://calendarmcp.googleapis.com/mcp/v1',
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
					},
				},
				tools: discoveredTools.map((tool) => expect.objectContaining({
					name: tool.name,
					permission: 'always-allow',
					requiresApproval: false,
				})),
			},
		]);
	});

	it('uses fetched Gmail MCP tools after OAuth completion', async () => {
		const { service, factory } = createService(createFakeMcpClient(), {
			env: { GOOGLE_OAUTH_CLIENT_ID: 'google-client-id' },
			openExternalUrl: jest.fn(async () => undefined),
		});
		const started = await service.authorizeOAuth({ connectorId: 'google.gmail' });

		const completed = service.completeOAuth({
			state: started.connector.oauth?.state,
			accessToken: 'access-token',
			tokenType: 'Bearer',
			expiresIn: 3600,
		});
		const tools = await service.refreshTools(completed.id);

		expect(tools).toEqual(expect.arrayContaining([
			expect.objectContaining({ name: 'search', permission: 'always-allow' }),
			expect.objectContaining({ name: 'write_note', permission: 'always-allow' }),
		]));
		expect(factory).toHaveBeenCalled();
	});

	it('keeps completed OAuth tokens out of connectors.json', async () => {
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
			expect.not.objectContaining({
				oauth: expect.anything(),
			}),
		]);
		expect(completed.oauth?.token).toMatchObject({ accessToken: '', refreshToken: '' });
		expect(service.list()[0]).toMatchObject({
			authKind: 'mcp_env',
			status: 'configured',
		});
	});

	it('stores dynamic connector records and discovers MCP tools on add', async () => {
		const { service, store, client } = createService();

		const added = await service.add(mcpInput());

		expect(client.listTools).toHaveBeenCalledTimes(1);
		expect(store.data.get('connectors')).toEqual([
			expect.objectContaining({
				id: added.id,
				connectorId: 'google.gmail',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
				tools: [
					expect.objectContaining({ name: 'search', permission: 'needs-approval', requiresApproval: true }),
					expect.objectContaining({ name: 'write_note', permission: 'blocked', requiresApproval: false }),
				],
			}),
		]);
		expect(added.authorization).toBe('');
		expect(service.list()).toEqual([
			expect.objectContaining({ name: 'Remote Gmail MCP', status: 'configured', toolsCount: 2 }),
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
		await expect(service.callTool(added.id, 'write_note', { text: 'draft' })).rejects.toThrow(
			'Tool write_note is blocked for Remote Gmail MCP.'
		);
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
