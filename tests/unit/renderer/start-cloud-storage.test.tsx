import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloudStep } from '../../../src/renderer/src/pages/start/components/CloudStep';
import StoragePage from '../../../src/renderer/src/pages/settings/pages/storage/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.storage.configurationTitle': 'Object Storage Configuration',
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
		'settings.storage.profile.title': 'Storage profile',
		'settings.storage.profile.description': 'Choose storage',
		'settings.storage.profile.label': 'Storage to use',
		'settings.storage.profile.help': 'Sync target',
		'settings.storage.sync.title': 'Folder sync',
		'settings.storage.sync.description': 'Upload folders on a schedule',
		'settings.storage.sync.addFolders': 'Add folders',
		'settings.storage.sync.save': 'Save schedule',
		'settings.storage.syncSaved': 'Schedule saved',
		'settings.storage.autoSync.title': 'Automatic sync',
		'settings.storage.autoSync.description': 'Run on schedule',
		'settings.storage.autoSync.enabled': 'Enable scheduled sync',
		'settings.storage.autoSync.cronExpression': 'Cron expression',
		'settings.storage.autoSync.cronDescription': 'Five-field cron expression',
		'settings.storage.folders.agent': 'Agent',
	};
	const t = (key: string): string => translations[key] ?? key;
	return { useTranslation: () => ({ t }) };
});

const storageApi = {
	getStorages: jest.fn(),
	getSelectedStorageId: jest.fn(),
	setSelectedStorageId: jest.fn(),
	saveStorageConfig: jest.fn(),
	deleteStorageConfig: jest.fn(),
	testConnection: jest.fn(),
	listObjects: jest.fn(),
	putObject: jest.fn(),
	getObject: jest.fn(),
	deleteObject: jest.fn(),
	sync: jest.fn(),
	syncFolders: jest.fn(),
	pickFolders: jest.fn(),
	push: jest.fn(),
	pull: jest.fn(),
};

beforeAll(() => {
	Object.defineProperty(globalThis.crypto, 'randomUUID', {
		configurable: true,
		value: () => 'storage-draft',
	});
	Object.defineProperty(window, 'PointerEvent', {
		configurable: true,
		value: MouseEvent,
	});
});

beforeEach(() => {
	Object.defineProperty(window, 'storage', { configurable: true, value: storageApi });
	storageApi.getStorages.mockResolvedValue([]);
	storageApi.getSelectedStorageId.mockResolvedValue(undefined);
	storageApi.syncFolders.mockResolvedValue([]);
	storageApi.pickFolders.mockResolvedValue([]);
	storageApi.saveStorageConfig.mockImplementation(async (config) => ({
		...config,
		id: 'storage-1',
	}));
});

describe('Start cloud storage step', () => {
	it('embeds the settings configurator and saves a storage provider', async () => {
		const user = userEvent.setup();
		render(<CloudStep />);

		expect(await screen.findByText('Connect to an object storage provider')).toBeInTheDocument();
		expect(screen.queryByText('Cloud storage settings')).not.toBeInTheDocument();
		expect(storageApi.getStorages).toHaveBeenCalledTimes(1);

		fireEvent.click(await screen.findByRole('button', { name: 'Add provider' }));
		await user.type(await screen.findByLabelText('Name'), 'Idra backup');
		await user.type(screen.getByLabelText('Bucket'), 'idra-data');
		await user.type(screen.getByLabelText('Access key ID'), 'access-key');
		await user.type(screen.getByLabelText('Secret access key'), 'secret-key');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() =>
			expect(storageApi.saveStorageConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Idra backup',
					bucket: 'idra-data',
					accessKeyId: 'access-key',
					secretAccessKey: 'secret-key',
				})
			)
		);
	});

	it('selects folders and saves a cron schedule for the stored profile', async () => {
		const user = userEvent.setup();
		const storage = {
			id: 'backup',
			name: 'Idra backup',
			endpoint: 'https://storage.example.com',
			region: 'us-east-1',
			accessKeyId: 'access',
			secretAccessKey: 'secret',
			bucket: 'idra',
			forcePathStyle: false,
			paths: [],
			syncEnabled: false,
			syncCronExpression: '0 3 * * *',
		};
		storageApi.getStorages.mockResolvedValue([storage]);
		storageApi.getSelectedStorageId.mockResolvedValue('backup');
		storageApi.syncFolders.mockResolvedValue([{ key: 'agent', path: '/data/agent' }]);

		render(<StoragePage />);

		expect(await screen.findByText('Storage profile')).toBeInTheDocument();
		await user.click(screen.getByRole('switch', { name: 'Agent' }));
		await user.click(screen.getByRole('switch', { name: 'Enable scheduled sync' }));
		await user.clear(screen.getByLabelText('Cron expression'));
		await user.type(screen.getByLabelText('Cron expression'), '0 4 * * *');
		await user.click(screen.getByRole('button', { name: 'Save schedule' }));

		await waitFor(() =>
			expect(storageApi.saveStorageConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'backup',
					paths: ['/data/agent'],
					syncEnabled: true,
					syncCronExpression: '0 4 * * *',
				})
			)
		);
	});
});
