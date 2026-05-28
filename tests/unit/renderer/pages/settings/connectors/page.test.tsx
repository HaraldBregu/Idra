import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
	OPENAI_CONNECTOR_CATALOG,
	type ConnectorConfig,
} from '../../../../../../src/shared/connectors';
import { ConnectorDocumentationRows } from '../../../../../../src/renderer/src/pages/settings/pages/connectors/components/ConnectorDocumentationRows';
import ConnectorDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/connectors/details/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function configuredConnector(): ConnectorConfig {
	return {
		id: 'connector-1',
		name: 'My Gmail',
		connectorId: 'connector_gmail',
		serverLabel: 'my_gmail',
		serverDescription: 'Gmail connector',
		enabled: true,
		authorization: '',
		requireApproval: 'always',
		allowedTools: ['search_emails'],
		deferLoading: false,
		tools: [{ name: 'search_emails', requiresApproval: true }],
		createdAt: '2026-05-22T00:00:00.000Z',
		updatedAt: '2026-05-22T00:00:00.000Z',
	};
}

function installConnectorApi(connector = configuredConnector()): void {
	window.connectors = {
		catalog: jest.fn(async () => OPENAI_CONNECTOR_CATALOG),
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
		connectOAuth: jest.fn(async () => ({ status: 'configured' })),
	};
}

function installAppApi(): void {
	window.app = {
		openExternalUrl: jest.fn(async () => undefined),
	} as typeof window.app;
}

function renderConnectorDetails(): void {
	render(
		<MemoryRouter initialEntries={['/settings/connectors/connectordetails/connector-1']}>
			<Routes>
				<Route path="/settings/connectors" element={<div>connectors list route</div>} />
				<Route
					path="/settings/connectors/connectordetails/:connectorId"
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

	it('renders docs metadata and opens platform docs through the app bridge', async () => {
		const user = userEvent.setup();
		const gmail = OPENAI_CONNECTOR_CATALOG.find((connector) => connector.id === 'connector_gmail');
		expect(gmail).toBeDefined();

		render(<ConnectorDocumentationRows connector={gmail!} />);

		expect(screen.getByText('Gmail connector guide')).toBeInTheDocument();
		expect(screen.getByText('docs/providers/google/gmail/index.md')).toBeInTheDocument();
		expect(screen.getByText('GOOGLE_OAUTH_CLIENT_ID')).toBeInTheDocument();
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
		expect(screen.getByText('GOOGLE_OAUTH_CLIENT_SECRET')).toBeInTheDocument();
		expect(screen.getByText('Gmail API reference')).toBeInTheDocument();
		expect(screen.getAllByText('search_emails').length).toBeGreaterThan(0);

		await waitFor(() => {
			expect(window.connectors.get).toHaveBeenCalledWith('connector-1');
			expect(window.connectors.listTools).toHaveBeenCalledWith('connector-1');
		});
	});
});
