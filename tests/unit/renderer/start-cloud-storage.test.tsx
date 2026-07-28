import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloudStep } from '../../../src/renderer/src/pages/start/components/CloudStep';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.storage': 'Cloud storage settings',
		'settings.storage.addProvider': 'Add provider',
		'settings.storage.empty': 'No storage configured',
		'settings.storage.name': 'Name',
		'settings.storage.namePlaceholder': 'Storage name',
		'settings.storage.endpoint': 'Endpoint',
		'settings.storage.region': 'Region',
		'settings.storage.bucket': 'Bucket',
		'settings.storage.accessKeyId': 'Access key ID',
		'settings.storage.secretAccessKey': 'Secret access key',
		'settings.storage.save': 'Save',
		'settings.storage.saved': 'Storage saved',
	};
	return { useTranslation: () => ({ t: (key: string) => translations[key] ?? key }) };
});

const storageApi = {
	getStorages: jest.fn(),
	saveStorageConfig: jest.fn(),
	deleteStorageConfig: jest.fn(),
	testConnection: jest.fn(),
	listObjects: jest.fn(),
	putObject: jest.fn(),
	getObject: jest.fn(),
	deleteObject: jest.fn(),
	sync: jest.fn(),
	syncFolders: jest.fn(),
	push: jest.fn(),
	pull: jest.fn(),
};

beforeAll(() => {
	Object.defineProperty(globalThis.crypto, 'randomUUID', {
		configurable: true,
		value: () => 'storage-draft',
	});
});

beforeEach(() => {
	Object.defineProperty(window, 'storage', { configurable: true, value: storageApi });
	storageApi.getStorages.mockResolvedValue([]);
	storageApi.syncFolders.mockResolvedValue([]);
	storageApi.saveStorageConfig.mockImplementation(async (config) => ({
		...config,
		id: 'storage-1',
	}));
});

describe('Start cloud storage step', () => {
	it('embeds the settings configurator and saves a storage provider', async () => {
		const user = userEvent.setup();
		render(<CloudStep />);

		expect(await screen.findByText('Configure cloud storage')).toBeInTheDocument();
		expect(screen.queryByText('Cloud storage settings')).not.toBeInTheDocument();
		expect(storageApi.getStorages).toHaveBeenCalledTimes(1);

		fireEvent.click(await screen.findByRole('button', { name: 'Add provider' }));
		await user.type(await screen.findByLabelText('Name'), 'Friday backup');
		await user.type(screen.getByLabelText('Bucket'), 'friday-data');
		await user.type(screen.getByLabelText('Access key ID'), 'access-key');
		await user.type(screen.getByLabelText('Secret access key'), 'secret-key');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() =>
			expect(storageApi.saveStorageConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Friday backup',
					bucket: 'friday-data',
					accessKeyId: 'access-key',
					secretAccessKey: 'secret-key',
				})
			)
		);
	});
});
