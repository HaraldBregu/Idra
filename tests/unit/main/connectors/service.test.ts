jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		const store = {
			data,
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			delete: (key: string) => {
				data.delete(key);
			},
		};
		Object.defineProperty(store, 'store', {
			configurable: true,
			get: () => Object.fromEntries(data),
			set: (value: Record<string, unknown>) => {
				data.clear();
				for (const [key, entry] of Object.entries(value)) data.set(key, entry);
			},
		});
		return store;
	});
});

import Store from 'electron-store';
import { ConnectorsService } from '../../../../src/main/connectors';
import type { ConnectorCatalogEntry, ConnectorTool } from '../../../../src/shared/connector';
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

const googleOAuthConnectors: Record<string, ConnectorCatalogEntry> = {
	'google.gmail': {
		id: 'google.gmail',
		name: 'Gmail',
		description: 'Authorize the official Gmail MCP server.',
		directConnectorId: 'gmail',
		environmentSecretNames: [],
		platformDocumentationPages: [],
		tools: [],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.compose',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',
		],
		setupInstructions: [],
		authKind: 'oauth',
		runtimeKind: 'mcp',
		allowMultipleInstances: false,
		mcp: {
			transport: 'http',
			url: 'https://gmailmcp.googleapis.com/mcp/v1',
			method: 'POST',
			headers: {
				accept: 'application/json, text/event-stream',
				'content-type': 'application/json',
			},
		},
			oauth: {
				providerId: 'google',
				clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
				clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
				authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				redirectUri: 'http://127.0.0.1',
			authorizationParams: {
				response_type: 'code',
				access_type: 'offline',
				include_granted_scopes: 'true',
				prompt: 'consent',
			},
		},
	},
	'google.calendar': {
		id: 'google.calendar',
		name: 'Google Calendar',
		description: 'Authorize the official Calendar MCP server.',
		directConnectorId: 'google_calendar',
		environmentSecretNames: [],
		platformDocumentationPages: [],
		tools: [],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/calendar.events.readonly',
			'https://www.googleapis.com/auth/calendar.events',
		],
		setupInstructions: [],
		authKind: 'oauth',
		runtimeKind: 'mcp',
		allowMultipleInstances: false,
		mcp: {
			transport: 'http',
			url: 'https://calendarmcp.googleapis.com/mcp/v1',
			method: 'POST',
			headers: {
				accept: 'application/json, text/event-stream',
				'content-type': 'application/json',
			},
		},
			oauth: {
				providerId: 'google',
				clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
				clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
				authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				redirectUri: 'http://127.0.0.1',
			authorizationParams: {
				response_type: 'code',
				access_type: 'offline',
				include_granted_scopes: 'true',
				prompt: 'consent',
			},
		},
	},
	'google.drive': {
		id: 'google.drive',
		name: 'Google Drive',
		description: 'Authorize the official Drive MCP server.',
		directConnectorId: 'google_drive',
		environmentSecretNames: [],
		platformDocumentationPages: [],
		tools: [],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/drive.readonly',
			'https://www.googleapis.com/auth/drive.file',
		],
		setupInstructions: [],
		authKind: 'oauth',
		runtimeKind: 'mcp',
		allowMultipleInstances: false,
		mcp: {
			transport: 'http',
			url: 'https://drivemcp.googleapis.com/mcp/v1',
			method: 'POST',
			headers: {
				accept: 'application/json, text/event-stream',
				'content-type': 'application/json',
			},
		},
			oauth: {
				providerId: 'google',
				clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
				clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
				authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				redirectUri: 'http://127.0.0.1',
			authorizationParams: {
				response_type: 'code',
				access_type: 'offline',
				include_granted_scopes: 'true',
				prompt: 'consent',
			},
		},
	},
};

function oauthInput(connectorId: string) {
	return { connectorId, connector: googleOAuthConnectors[connectorId] };
}

function createFakeMcpClient(tools = discoveredTools) {
	return {
		listTools: jest.fn(async () => tools),
		callTool: jest.fn(async (name: string, args: Record<string, unknown>) => ({ name, args })),
		close: jest.fn(async () => undefined),
	};
}

function createTokenFetch(overrides: Record<string, unknown> = {}) {
	return jest.fn(async () => ({
		ok: true,
		status: 200,
		statusText: 'OK',
		text: async () => JSON.stringify({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
			token_type: 'Bearer',
			scope: 'https://www.googleapis.com/auth/gmail.readonly',
			expires_in: 3600,
			...overrides,
		}),
	})) as jest.MockedFunction<typeof fetch>;
}

function createOAuthOptions(overrides: { readonly fetch?: typeof fetch } = {}) {
	const tokenFetch = overrides.fetch ?? createTokenFetch();
	const openExternalUrl = jest.fn(async (authorizationUrl: string) => {
		const url = new URL(authorizationUrl);
		const redirectUri = url.searchParams.get('redirect_uri');
		const state = url.searchParams.get('state');
		if (!redirectUri || !state) throw new Error('OAuth URL missing redirect details.');
		await fetch(`${redirectUri}?code=authorization-code&state=${state}`);
	});
	return {
		env: {
			GOOGLE_OAUTH_CLIENT_ID: 'google-client-id',
			GOOGLE_OAUTH_CLIENT_SECRET: 'google-client-secret',
		},
		openExternalUrl,
		fetch: tokenFetch,
	};
}

function createService(client = createFakeMcpClient(), options: {
	readonly env?: NodeJS.ProcessEnv;
	readonly openExternalUrl?: (url: string) => Promise<void>;
	readonly fetch?: typeof fetch;
} = {}) {
	const logger = makeLogger();
	const factory = jest.fn(() => client);
	const service = new ConnectorsService(logger as never, {
		mcpClientFactory: factory,
		env: options.env,
		openExternalUrl: options.openExternalUrl,
		fetch: options.fetch,
	});
	const stores = MockStore.mock.results.slice(-1).map((result) => result.value as {
		data: Map<string, unknown>;
		get: jest.Mock;
		set: jest.Mock;
		delete: jest.Mock;
		store: Record<string, unknown>;
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

	it('opens Google OAuth through the backend and stores full connector data by provider key', async () => {
		const oauthOptions = createOAuthOptions();
		const { service, store } = createService(createFakeMcpClient(), oauthOptions);

		const result = await service.authorizeOAuth(oauthInput('google.gmail'));

		expect(oauthOptions.openExternalUrl).toHaveBeenCalledWith(result.authorizationUrl);
		const url = new URL(result.authorizationUrl);
		expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
		expect(url.searchParams.get('client_id')).toBe('google-client-id');
		expect(url.searchParams.get('response_type')).toBe('code');
		expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
		expect(url.searchParams.get('redirect_uri')).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/oauth\/callback$/);
		expect(url.searchParams.get('code_challenge')).toEqual(expect.any(String));
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		const tokenRequest = oauthOptions.fetch.mock.calls[0]?.[1] as RequestInit;
		const tokenBody = new URLSearchParams(tokenRequest.body as string);
		expect(oauthOptions.fetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.any(Object));
		expect(tokenBody.get('code')).toBe('authorization-code');
		expect(tokenBody.get('client_secret')).toBe('google-client-secret');
		expect(tokenBody.get('code_verifier')).toEqual(expect.any(String));
		expect(Object.fromEntries(store.data)).toEqual({
			gmail: expect.objectContaining({
				id: 'google.gmail',
				name: 'Gmail',
				connectorId: 'google.gmail',
				serverLabel: 'gmail',
				mcp: {
					transport: 'http',
					url: 'https://gmailmcp.googleapis.com/mcp/v1',
					method: 'POST',
					headers: {
						accept: 'application/json, text/event-stream',
						'content-type': 'application/json',
					},
				},
					oauth: expect.objectContaining({
						clientId: 'google-client-id',
						authorizationUrl: result.authorizationUrl,
						state: expect.any(String),
						token: expect.objectContaining({
							accessToken: 'access-token',
							refreshToken: 'refresh-token',
						}),
					}),
					authorization: 'Bearer access-token',
					tools: discoveredTools.map((tool) => expect.objectContaining({
						name: tool.name,
					permission: 'always-allow',
					requiresApproval: false,
				})),
			}),
		});
		expect(result.connector.oauth).toEqual(expect.objectContaining({
			clientId: 'google-client-id',
			authorizationUrl: result.authorizationUrl,
			token: expect.objectContaining({
				accessToken: '',
				refreshToken: '',
			}),
			state: expect.any(String),
		}));
		expect(result.connector.authorization).toBe('');
	});

	it('stores Calendar MCP setup and fetched tools in connectors.json', async () => {
		const { service, store } = createService(createFakeMcpClient(), createOAuthOptions());

		await service.authorizeOAuth(oauthInput('google.calendar'));

		expect(Object.fromEntries(store.data)).toEqual({
			google_calendar: expect.objectContaining({
				connectorId: 'google.calendar',
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
			}),
		});
	});

	it('uses fetched Gmail MCP tools after OAuth completion', async () => {
		const { service, factory } = createService(createFakeMcpClient(), createOAuthOptions());
		const started = await service.authorizeOAuth(oauthInput('google.gmail'));

		const tools = await service.refreshTools(started.connector.id);

		expect(tools).toEqual(expect.arrayContaining([
			expect.objectContaining({ name: 'search', permission: 'always-allow' }),
			expect.objectContaining({ name: 'write_note', permission: 'always-allow' }),
		]));
		expect(factory).toHaveBeenCalled();
	});

	it('stores completed OAuth token state on the connector', async () => {
		const { service, store } = createService(createFakeMcpClient(), createOAuthOptions());
		const started = await service.authorizeOAuth(oauthInput('google.drive'));

		expect(Object.fromEntries(store.data)).toEqual({
			google_drive: expect.objectContaining({
					connectorId: 'google.drive',
					authorization: 'Bearer access-token',
					oauth: expect.objectContaining({
						accountEmail: 'user@example.com',
						token: expect.objectContaining({
						accessToken: 'access-token',
						refreshToken: 'refresh-token',
						tokenType: 'Bearer',
					}),
				}),
			}),
		});
		expect(started.connector.authorization).toBe('');
		expect(started.connector.oauth?.token).toMatchObject({ accessToken: '', refreshToken: '' });
		expect(service.list()[0]).toMatchObject({
			authKind: 'oauth',
			status: 'configured',
			hasToken: true,
			hasTools: true,
			connectedAccount: 'user@example.com',
		});
	});

	it('stores dynamic connector records and discovers MCP tools on add', async () => {
		const { service, store, client } = createService();

		const added = await service.add(mcpInput());

		expect(client.listTools).toHaveBeenCalledTimes(1);
		expect(Object.fromEntries(store.data)).toEqual({
			gmail_mcp: expect.objectContaining({
				id: added.id,
				connectorId: 'google.gmail',
				mcp: { transport: 'http', url: 'https://mcp.example.test/mcp' },
				tools: [
					expect.objectContaining({ name: 'search', permission: 'needs-approval', requiresApproval: true }),
					expect.objectContaining({ name: 'write_note', permission: 'blocked', requiresApproval: false }),
				],
			}),
		});
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

		Object.defineProperty(store, 'store', {
			configurable: true,
			get: () => {
				throw new Error('read failed');
			},
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
