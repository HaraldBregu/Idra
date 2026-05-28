import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ConnectorCatalogEntry, ConnectorConfig } from '../../../../../../src/shared/connector';
import { ConnectorDocumentationRows } from '../../../../../../src/renderer/src/pages/settings/pages/connectors/components/ConnectorDocumentationRows';
import ConnectorsPage from '../../../../../../src/renderer/src/pages/settings/pages/connectors/Page';
import ConnectorDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/connectors/details/Page';

const CONNECTOR_CATALOG: ConnectorCatalogEntry[] = [
	{
		id: 'google.gmail',
		name: 'Gmail',
		description: 'Gmail connector',
		docsLabel: 'Gmail connector guide',
		docsPath: 'docs/providers/google/gmail/index.md',
		environmentSecretNames: ['GOOGLE_MCP_API_KEY'],
		platformDocumentationPages: [
			{ label: 'Gmail API guides', url: 'https://developers.google.com/workspace/gmail/api/guides' },
			{ label: 'Gmail API reference', url: 'https://developers.google.com/workspace/gmail/api/reference/rest' },
		],
		example: { tool: 'search_emails', input: { query: 'from:alice@example.com newer_than:7d' } },
		tools: ['search_emails'],
		scopes: [],
		setupInstructions: [],
		authKind: 'mcp_env',
		runtimeKind: 'mcp',
		allowMultipleInstances: true,
	},
	{
		id: 'dropbox.files',
		name: 'Dropbox',
		description: 'Dropbox connector',
		environmentSecretNames: ['DROPBOX_MCP_API_KEY'],
		platformDocumentationPages: [],
		tools: ['search'],
		scopes: [],
		setupInstructions: [],
		authKind: 'mcp_env',
		runtimeKind: 'mcp',
		allowMultipleInstances: true,
	},
];

jest.mock(
	'../../../../../../src/renderer/src/pages/settings/pages/connectors/components/ConnectorIcon',
	() => ({
		ConnectorIcon: ({ name }: { readonly name: string }) => (
			<span aria-hidden="true" data-testid="connector-icon">
				{name}
			</span>
		),
	})
);

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function configuredConnector(): ConnectorConfig {
	return {
		id: 'connector-1',
		name: 'My Gmail',
		connectorId: 'google.gmail',
		serverLabel: 'my_gmail',
		serverDescription: 'Gmail connector',
		enabled: true,
		authorization: '',
		requireApproval: 'always',
		allowedTools: ['search_emails'],
		deferLoading: false,
		tools: [{ name: 'search_emails', permission: 'needs-approval', requiresApproval: true }],
		createdAt: '2026-05-22T00:00:00.000Z',
		updatedAt: '2026-05-22T00:00:00.000Z',
	};
}

function connectorView(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
	return {
		id: 'google.gmail',
		name: 'Gmail',
		connectorId: 'google.gmail',
		authKind: 'oauth',
		serverLabel: 'gmail',
		enabled: true,
		status: 'missing_auth',
		requireApproval: 'always',
		allowedToolsCount: 0,
		toolsCount: 0,
		hasToken: false,
		hasTools: false,
		deferLoading: false,
		...overrides,
	};
}

function installConnectorApi(connector = configuredConnector()): void {
	window.connectors = {
		catalog: jest.fn(async () => CONNECTOR_CATALOG),
		list: jest.fn(async () => []),
		get: jest.fn(async () => connector),
		add: jest.fn(async () => connector),
		update: jest.fn(async () => connector),
		remove: jest.fn(async () => undefined),
		enable: jest.fn(async () => connector),
		disable: jest.fn(async () => connector),
		test: jest.fn(async () => ({ status: 'configured' })),
		reconnect: jest.fn(async () => ({ status: 'configured' })),
		refreshTools: jest.fn(async () => connector.tools),
		listTools: jest.fn(async () => connector.tools),
		callTool: jest.fn(async () => ({})),
			authorizeOAuth: jest.fn(async (selected: string | ConnectorCatalogEntry) => ({
				connectorId: typeof selected === 'string' ? selected : selected.id,
				authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				connector,
			})),
	};
}

function installAppApi(): void {
	window.app = {
		openExternalUrl: jest.fn(async () => undefined),
	} as typeof window.app;
}

function renderConnectorsPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/connectors']}>
			<Routes>
				<Route path="/settings/connectors" element={<ConnectorsPage />} />
				<Route path="/settings/connectors/connectordetails/:connectorId" element={<div>connector details route</div>} />
				<Route path="/settings/connectors/configure/:connectorCatalogId" element={<div>configure route</div>} />
			</Routes>
		</MemoryRouter>
	);
}

function renderConnectorDetails(
	initialEntry = '/settings/connectors/connectordetails/connector-1'
): void {
	render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route path="/settings/connectors" element={<div>connectors list route</div>} />
				<Route
					path="/settings/connectors/connectordetails/:connectorId"
					element={<ConnectorDetailsPage />}
				/>
				<Route
					path="/settings/connectors/configure/:connectorCatalogId"
					element={<ConnectorDetailsPage />}
				/>
			</Routes>
		</MemoryRouter>
	);
}

describe('connector settings docs', () => {
	beforeEach(() => {
		installAppApi();
		installConnectorApi();
	});

	it('renders only the hardcoded Gmail OAuth connector and authorizes through the connectors API', async () => {
		const user = userEvent.setup();
		(window.connectors.list as jest.Mock).mockResolvedValue([
			{
				...configuredConnector(),
				id: 'dropbox-configured',
				name: 'Configured Dropbox',
				connectorId: 'dropbox.files',
				serverLabel: 'dropbox',
				tools: [],
			},
		]);

		renderConnectorsPage();

		const gmailLabels = await screen.findAllByText('Gmail');
		expect(gmailLabels.length).toBeGreaterThan(0);
		expect(screen.queryByText('Dropbox')).not.toBeInTheDocument();
		expect(screen.queryByText('Configured Dropbox')).not.toBeInTheDocument();
		expect(screen.queryByText('Google Calendar')).not.toBeInTheDocument();
		expect(screen.queryByText('Google Drive')).not.toBeInTheDocument();
		expect(window.connectors.catalog).not.toHaveBeenCalled();

		await user.click(gmailLabels[0]!);

		expect(window.connectors.authorizeOAuth).toHaveBeenCalledWith(expect.objectContaining({
			id: 'google.gmail',
			mcp: expect.objectContaining({ url: 'https://gmailmcp.googleapis.com/mcp/v1' }),
			oauth: expect.objectContaining({ clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID' }),
		}));
		expect(window.app.openExternalUrl).not.toHaveBeenCalled();
		expect(window.connectors.add).not.toHaveBeenCalled();
		expect(window.connectors.update).not.toHaveBeenCalled();
	});

	it('refreshes missing tools for a saved Google connector state', async () => {
		(window.connectors.list as jest.Mock)
			.mockResolvedValueOnce([connectorView()])
			.mockResolvedValueOnce([connectorView({ toolsCount: 2, hasTools: true })]);

		renderConnectorsPage();

		await waitFor(() => {
			expect(window.connectors.refreshTools).toHaveBeenCalledWith('google.gmail');
		});
		await waitFor(() => {
			expect(window.connectors.list).toHaveBeenCalledTimes(2);
		});
		expect(window.connectors.catalog).not.toHaveBeenCalled();
	});

	it('renders docs metadata and opens platform docs through the app bridge', async () => {
		const user = userEvent.setup();
		const gmail = CONNECTOR_CATALOG.find((connector) => connector.id === 'google.gmail');
		expect(gmail).toBeDefined();

		render(<ConnectorDocumentationRows connector={gmail!} />);

		expect(screen.getByText('Gmail connector guide')).toBeInTheDocument();
		expect(screen.getByText('docs/providers/google/gmail/index.md')).toBeInTheDocument();
		expect(screen.getByText('GOOGLE_MCP_API_KEY')).toBeInTheDocument();
		expect(screen.getByText('search_emails')).toBeInTheDocument();
		expect(screen.getByText('{"query":"from:alice@example.com newer_than:7d"}')).toBeInTheDocument();

		await user.click(screen.getByRole('link', { name: /Gmail API guides/ }));

		expect(window.app.openExternalUrl).toHaveBeenCalledWith(
			'https://developers.google.com/workspace/gmail/api/guides'
		);
	});

	it('shows connector docs on the connector detail page', async () => {
		renderConnectorDetails();

		expect(await screen.findByText('My Gmail')).toBeInTheDocument();
		expect(screen.getByText('Gmail connector guide')).toBeInTheDocument();
		expect(screen.getByText('docs/providers/google/gmail/index.md')).toBeInTheDocument();
		expect(screen.getByText('GOOGLE_MCP_API_KEY')).toBeInTheDocument();
		expect(screen.getByText('Gmail API reference')).toBeInTheDocument();
		expect(screen.getAllByText('search_emails').length).toBeGreaterThan(0);

		await waitFor(() => {
			expect(window.connectors.get).toHaveBeenCalledWith('connector-1');
			expect(window.connectors.listTools).toHaveBeenCalledWith('connector-1');
		});
	});

	it('updates connector configuration from the detail page without resending saved manual tokens', async () => {
		const user = userEvent.setup();
		const connector = {
			...configuredConnector(),
			connectorId: 'dropbox.files',
			name: 'My Dropbox',
			serverLabel: 'my_dropbox',
			authorization: '',
			allowedTools: ['search'],
			tools: [{ name: 'search', permission: 'always-allow', requiresApproval: false }],
		} satisfies ConnectorConfig;
		installConnectorApi(connector);

		renderConnectorDetails();

		await user.clear(await screen.findByLabelText('Name'));
		await user.type(screen.getByLabelText('Name'), 'Dropbox Files');
		await user.click(screen.getByRole('button', { name: /Save Changes/ }));

		await waitFor(() => {
			expect(window.connectors.update).toHaveBeenCalledWith(
				'connector-1',
				expect.not.objectContaining({ authorization: expect.any(String) })
			);
		});
		expect(window.connectors.update).toHaveBeenCalledWith(
			'connector-1',
			expect.objectContaining({
				name: 'Dropbox Files',
				connectorId: 'dropbox.files',
			})
		);
	});

	it('adds a catalog connector from its configure detail page', async () => {
		const user = userEvent.setup();
		const connector = {
			...configuredConnector(),
			id: 'connector-dropbox',
			connectorId: 'dropbox.files',
			name: 'Dropbox',
			serverLabel: 'dropbox',
			authorization: '',
			allowedTools: ['search'],
			tools: [{ name: 'search', permission: 'always-allow', requiresApproval: false }],
		} satisfies ConnectorConfig;
		installConnectorApi(connector);
		(window.connectors.list as jest.Mock).mockResolvedValue([]);

		renderConnectorDetails('/settings/connectors/configure/dropbox.files');

		const mcpConfig = await screen.findByLabelText('MCP config');
		expect((mcpConfig as HTMLTextAreaElement).value).toContain('https://example.com/mcp');
		await user.click(screen.getByRole('button', { name: /Add Connector/ }));

		await waitFor(() => {
			expect(window.connectors.add).toHaveBeenCalledWith(
				expect.objectContaining({
					connectorId: 'dropbox.files',
					mcp: expect.objectContaining({ transport: 'http' }),
				})
			);
		});
	});
});
