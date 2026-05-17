import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralPage from '../../../../../src/renderer/src/pages/settings/pages/GeneralPage';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

describe('GeneralPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			getTrayEnabled: jest.fn(async () => true),
			setTrayEnabled: jest.fn(async () => undefined),
			openAppDataFolder: jest.fn(async () => undefined),
			openUserDataFolder: jest.fn(async () => undefined),
		};
	});

	it('renders application information from build-time constants', async () => {
		render(<GeneralPage />);

		expect(await screen.findByText('Friday')).toBeInTheDocument();
		expect(screen.getByText('0.0.0-test')).toBeInTheDocument();
		expect(screen.getByText('MIT')).toBeInTheDocument();
	});

	it('loads and reflects the initial tray state', async () => {
		(window.app.getTrayEnabled as jest.Mock).mockResolvedValue(false);
		render(<GeneralPage />);

		const toggle = await screen.findByRole('switch', { name: 'settings.application.menuBar' });
		await waitFor(() => {
			expect(toggle).toHaveAttribute('aria-checked', 'false');
		});
	});

	it('calls setTrayEnabled when the menu bar switch is toggled', async () => {
		const user = userEvent.setup();
		render(<GeneralPage />);

		const toggle = await screen.findByRole('switch', { name: 'settings.application.menuBar' });
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setTrayEnabled).toHaveBeenCalledWith(false);
		});
	});

	it('calls openAppDataFolder when the app data button is clicked', async () => {
		const user = userEvent.setup();
		render(<GeneralPage />);

		await screen.findByText('Friday');

		const buttons = screen.getAllByRole('button', { name: 'settings.application.openAppData' });
		await user.click(buttons[0]);

		await waitFor(() => {
			expect(window.app.openAppDataFolder).toHaveBeenCalled();
		});
	});
});
