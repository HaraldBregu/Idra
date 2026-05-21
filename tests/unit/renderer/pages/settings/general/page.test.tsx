import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import GeneralPage from '../../../../../../src/renderer/src/pages/settings/pages/general/Page';

jest.mock('react-i18next', () => ({
	initReactI18next: { type: '3rdParty', init: () => undefined },
	useTranslation: () => ({
		t: (key: string, params?: Record<string, unknown>) => {
			if (!params) return key;
			return `${key}:${Object.entries(params)
				.map(([paramKey, value]) => `${paramKey}=${String(value)}`)
				.join(',')}`;
		},
	}),
}));

jest.mock('@/contexts', () => ({
	useApp: () => ({
		theme: 'system',
		translucency: { light: 80, dark: 60 },
		language: 'en',
		setTheme: jest.fn(),
		setTranslucency: jest.fn(),
		setLanguage: jest.fn(),
	}),
}));

jest.mock('@/components/ui/select', () => {
	const Passthrough = ({ children }: { readonly children?: ReactNode }) => (
		<div>{children}</div>
	);

	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => <span />,
	};
});

jest.mock('@/components/ui/slider', () => ({
	Slider: ({ 'aria-label': ariaLabel }: { readonly 'aria-label'?: string }) => (
		<input aria-label={ariaLabel} readOnly type="range" />
	),
}));

function renderGeneralPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/general']}>
			<GeneralPage />
		</MemoryRouter>
	);
}

describe('GeneralPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			getTrayEnabled: jest.fn(async () => true),
			setTrayEnabled: jest.fn(async () => undefined),
			getKeepAwakeEnabled: jest.fn(async () => false),
			setKeepAwakeEnabled: jest.fn(async (enabled: boolean) => enabled),
			getMicrophonePermission: jest.fn(async () => ({
				enabled: true,
				systemStatus: 'not-determined',
				canRequest: true,
			})),
			setMicrophoneEnabled: jest.fn(async (enabled: boolean) => ({
				enabled,
				systemStatus: 'not-determined',
				canRequest: true,
			})),
			requestMicrophonePermission: jest.fn(async () => ({
				enabled: true,
				systemStatus: 'granted',
				canRequest: false,
			})),
			openAppDataFolder: jest.fn(async () => undefined),
			openUserDataFolder: jest.fn(async () => undefined),
		};
	});

	it('renders application information from build-time constants', async () => {
		renderGeneralPage();

		expect(await screen.findByText('Friday')).toBeInTheDocument();
		expect(screen.getByText('0.0.0-test')).toBeInTheDocument();
		expect(screen.getByText('AI desktop assistant')).toBeInTheDocument();
	});

	it('loads and reflects the initial tray state', async () => {
		(window.app.getTrayEnabled as jest.Mock).mockResolvedValue(false);
		renderGeneralPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.menuBar' });
		await waitFor(() => {
			expect(toggle).toHaveAttribute('aria-checked', 'false');
		});
	});

	it('calls setTrayEnabled when the menu bar switch is toggled', async () => {
		const user = userEvent.setup();
		renderGeneralPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.menuBar' });
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setTrayEnabled).toHaveBeenCalledWith(false);
		});
	});

	it('loads and reflects the initial keep-awake state', async () => {
		(window.app.getKeepAwakeEnabled as jest.Mock).mockResolvedValue(true);
		renderGeneralPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.keepAwake' });
		await waitFor(() => {
			expect(toggle).toHaveAttribute('aria-checked', 'true');
		});
	});

	it('calls setKeepAwakeEnabled when the keep-awake switch is toggled', async () => {
		const user = userEvent.setup();
		renderGeneralPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.keepAwake' });
		await waitFor(() => {
			expect(toggle).not.toBeDisabled();
		});
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setKeepAwakeEnabled).toHaveBeenCalledWith(true);
		});
	});

	it('loads microphone permission state', async () => {
		renderGeneralPage();

		expect(
			await screen.findByRole('switch', { name: 'settings.microphone.recording' })
		).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByText('settings.microphone.status.not-determined')).toBeInTheDocument();
	});

	it('calls setMicrophoneEnabled when the microphone switch is toggled', async () => {
		const user = userEvent.setup();
		renderGeneralPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.microphone.recording' });
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setMicrophoneEnabled).toHaveBeenCalledWith(false);
		});
	});

	it('requests microphone permission from the action button', async () => {
		const user = userEvent.setup();
		renderGeneralPage();

		await user.click(await screen.findByRole('button', { name: 'settings.microphone.actions.request' }));

		await waitFor(() => {
			expect(window.app.requestMicrophonePermission).toHaveBeenCalled();
		});
	});

	it('calls openAppDataFolder when the app data button is clicked', async () => {
		const user = userEvent.setup();
		renderGeneralPage();

		await screen.findByText('Friday');

		const buttons = screen.getAllByRole('button', { name: 'settings.application.openAppData' });
		await user.click(buttons[0]);

		await waitFor(() => {
			expect(window.app.openAppDataFolder).toHaveBeenCalled();
		});
	});

	it('does not render the agents list in General settings', async () => {
		renderGeneralPage();

		await screen.findByText('Friday');

		expect(screen.queryByText('settings.operators.fridayName')).not.toBeInTheDocument();
	});
});
