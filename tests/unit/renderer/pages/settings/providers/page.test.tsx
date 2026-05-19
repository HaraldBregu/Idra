import { render, screen, waitFor } from '@testing-library/react';
import ProvidersPage from '../../../../../../src/renderer/src/pages/settings/pages/providers/Page';
import { CONNECTOR_PROVIDER_PLATFORMS } from '../../../../../../src/shared/connectors';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe('ProvidersPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			isProviderApiKeySaved: jest.fn(async () => false),
			setProviderApiKey: jest.fn(async () => undefined),
			openExternalUrl: jest.fn(async () => undefined),
		};
	});

	it('renders all shared connector provider platforms under providers settings', async () => {
		render(<ProvidersPage />);

		await waitFor(() => {
			expect(window.app.isProviderApiKeySaved).toHaveBeenCalled();
		});

		expect(screen.getByText('settings.providers.connectorProviderPlatforms')).toBeInTheDocument();
		expect(screen.getByText(`${CONNECTOR_PROVIDER_PLATFORMS.length} platforms`)).toBeInTheDocument();
		expect(screen.getByText('Composio')).toBeInTheDocument();
		expect(screen.getByText('Microsoft Power Automate')).toBeInTheDocument();
		expect(screen.getByText('Qdrant')).toBeInTheDocument();
	});
});
