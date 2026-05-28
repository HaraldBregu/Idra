import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppInfo } from '../../../../../../src/shared/apps';
import AppsPage from '../../../../../../src/renderer/src/pages/settings/pages/apps/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.name) return `${key}:${params.name}`;
			return key;
		},
	}),
}));

function makeApp(id: string, name: string): AppInfo {
	return {
		id,
		folderPath: `/apps/${id}`,
		manifest: { name, version: '1.0.0', description: `${name} description` },
	};
}

describe('AppsPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			listApps: jest.fn(async () => []),
			getAppsRoot: jest.fn(async () => '/apps'),
			openAppFolder: jest.fn(async () => undefined),
			deleteApp: jest.fn(async () => undefined),
		};
	});

	it('shows empty state when no apps are installed', async () => {
		render(<AppsPage />);

		expect(await screen.findByText('settings.apps.empty')).toBeInTheDocument();
	});

	it('renders installed apps by name', async () => {
		(window.app.listApps as jest.Mock).mockResolvedValue([
			makeApp('weather', 'Weather'),
			makeApp('notes', 'Notes'),
		]);

		render(<AppsPage />);

		expect(await screen.findByText('Weather')).toBeInTheDocument();
		expect(screen.getByText('Notes')).toBeInTheDocument();
	});

	it('calls openAppFolder when the open folder button is clicked', async () => {
		(window.app.listApps as jest.Mock).mockResolvedValue([makeApp('weather', 'Weather')]);

		const user = userEvent.setup();
		render(<AppsPage />);

		await screen.findByText('Weather');
		await user.click(screen.getByRole('button', { name: 'settings.apps.openFolder' }));

		await waitFor(() => {
			expect(window.app.openAppFolder).toHaveBeenCalledWith('weather');
		});
	});

	it('calls deleteApp and refreshes after confirmation', async () => {
		(window.app.listApps as jest.Mock).mockResolvedValue([makeApp('weather', 'Weather')]);
		jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		render(<AppsPage />);

		await screen.findByText('Weather');
		await user.click(screen.getByRole('button', { name: 'settings.apps.delete' }));

		await waitFor(() => {
			expect(window.app.deleteApp).toHaveBeenCalledWith('weather');
		});
	});

	it('refreshes the app list when the refresh button is clicked', async () => {
		const user = userEvent.setup();
		render(<AppsPage />);

		await screen.findByText('settings.apps.empty');

		await user.click(screen.getByRole('button', { name: 'settings.apps.refresh' }));

		await waitFor(() => {
			expect(window.app.listApps).toHaveBeenCalledTimes(2);
		});
	});
});
