import { render, screen } from '@testing-library/react';
import CloudPage from '../../../src/renderer/src/pages/settings/pages/cloud/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) =>
			({
				'settings.tabs.cloud': 'Cloud',
				'settings.overview.descriptions.cloud': 'Cloud storage and sync',
				'settings.storage.configurationTitle': 'Object Storage Configuration',
				'settings.storage.description': 'Configure S3-compatible storage providers.',
				'settings.storage.empty': 'No storage providers configured.',
				'settings.storage.addProvider': 'Add provider',
			})[key] ?? key,
	}),
}));

const storageApi = {
	getStorages: jest.fn(),
	syncFolders: jest.fn(),
	getStorageConfiguration: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'storage', { configurable: true, value: storageApi });
	storageApi.getStorages.mockResolvedValue([]);
	storageApi.syncFolders.mockResolvedValue([]);
	storageApi.getStorageConfiguration.mockResolvedValue({
		providerId: '',
		paths: [],
		syncEnabled: false,
		syncCronExpression: '0 3 * * *',
	});
});

it('renders object storage configuration inside the Cloud page', async () => {
	render(<CloudPage />);

	expect(screen.getByRole('heading', { name: 'Cloud' })).toBeInTheDocument();
	expect(screen.getByText('Object Storage Configuration')).toBeInTheDocument();
	expect(await screen.findByRole('button', { name: 'Add provider' })).toBeInTheDocument();
});
