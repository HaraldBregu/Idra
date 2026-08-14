import { render, screen, waitFor } from '@testing-library/react';
import { ResourcesStep } from '../../../src/renderer/src/pages/start/components/ResourcesStep';

const searchApi = {
	getSettings: jest.fn(),
	selectEngine: jest.fn(),
};
const storageApi = {
	getStorages: jest.fn(),
	getStorageConfiguration: jest.fn(),
	saveStorageConfiguration: jest.fn(),
};
const databaseApi = {
	getConfiguration: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'search', { configurable: true, value: searchApi });
	Object.defineProperty(window, 'storage', { configurable: true, value: storageApi });
	Object.defineProperty(window, 'database', { configurable: true, value: databaseApi });
	searchApi.getSettings.mockResolvedValue({
		engineId: 'brave',
		configured: { brave: true, tavily: false },
	});
	storageApi.getStorages.mockResolvedValue([]);
	storageApi.getStorageConfiguration.mockResolvedValue(null);
});

it('shows search and storage selectors without a database selector', async () => {
	render(<ResourcesStep />);

	expect(screen.getByRole('heading', { name: 'Search engine' })).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'Storage' })).toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'Database' })).not.toBeInTheDocument();
	await waitFor(() => expect(searchApi.getSettings).toHaveBeenCalledTimes(1));
	expect(databaseApi.getConfiguration).not.toHaveBeenCalled();
});
