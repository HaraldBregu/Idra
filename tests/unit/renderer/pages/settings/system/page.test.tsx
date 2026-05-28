import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SystemPage from '../../../../../../src/renderer/src/pages/settings/pages/system/Page';

jest.mock('react-i18next', () => ({
	initReactI18next: { type: '3rdParty', init: () => undefined },
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function renderSystemPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/system']}>
			<SystemPage />
		</MemoryRouter>
	);
}

describe('SystemPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
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
			getCameraPermission: jest.fn(async () => ({
				enabled: true,
				systemStatus: 'not-determined',
				canRequest: true,
			})),
			setCameraEnabled: jest.fn(async (enabled: boolean) => ({
				enabled,
				systemStatus: 'not-determined',
				canRequest: true,
			})),
			requestCameraPermission: jest.fn(async () => ({
				enabled: true,
				systemStatus: 'granted',
				canRequest: false,
			})),
			openSystemPreference: jest.fn(async () => undefined),
		};
	});

	it('renders the documented capability reference', async () => {
		renderSystemPage();

		expect(
			await screen.findByText('settings.system.capabilities.items.openWindowsAndUi.title')
		).toBeInTheDocument();
		expect(
			screen.getByText('settings.system.capabilities.items.installDrivers.title')
		).toBeInTheDocument();
		expect(screen.getAllByText('settings.system.availability.yes').length).toBeGreaterThan(0);
		expect(screen.getByText('settings.system.availability.yesHighPrivilege')).toBeInTheDocument();
	});

	it('loads and reflects the initial keep-awake state', async () => {
		(window.app.getKeepAwakeEnabled as jest.Mock).mockResolvedValue(true);
		renderSystemPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.keepAwake' });
		await waitFor(() => {
			expect(toggle).toHaveAttribute('aria-checked', 'true');
		});
	});

	it('calls setKeepAwakeEnabled when the keep-awake switch is toggled', async () => {
		const user = userEvent.setup();
		renderSystemPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.application.keepAwake' });
		await waitFor(() => {
			expect(toggle).not.toBeDisabled();
		});
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setKeepAwakeEnabled).toHaveBeenCalledWith(true);
		});
	});

	it('loads microphone and camera permission state', async () => {
		renderSystemPage();

		expect(
			await screen.findByRole('switch', { name: 'settings.microphone.recording' })
		).toHaveAttribute('aria-checked', 'true');
		expect(screen.getByRole('switch', { name: 'settings.camera.access' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
		expect(screen.getAllByText('settings.system.permissionStatus.not-determined')).toHaveLength(2);
	});

	it('calls setMicrophoneEnabled when the microphone switch is toggled', async () => {
		const user = userEvent.setup();
		renderSystemPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.microphone.recording' });
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setMicrophoneEnabled).toHaveBeenCalledWith(false);
		});
	});

	it('calls setCameraEnabled when the camera switch is toggled', async () => {
		const user = userEvent.setup();
		renderSystemPage();

		const toggle = await screen.findByRole('switch', { name: 'settings.camera.access' });
		await user.click(toggle);

		await waitFor(() => {
			expect(window.app.setCameraEnabled).toHaveBeenCalledWith(false);
		});
	});

	it('requests media permissions from action buttons', async () => {
		const user = userEvent.setup();
		renderSystemPage();

		await user.click(await screen.findByRole('button', { name: 'settings.microphone.actions.request' }));
		await user.click(await screen.findByRole('button', { name: 'settings.camera.actions.request' }));

		await waitFor(() => {
			expect(window.app.requestMicrophonePermission).toHaveBeenCalled();
			expect(window.app.requestCameraPermission).toHaveBeenCalled();
		});
	});

	it('opens system preference panes from action buttons', async () => {
		const user = userEvent.setup();
		renderSystemPage();

		await user.click(
			await screen.findByRole('button', { name: 'settings.application.openAccessibility' })
		);
		await user.click(
			await screen.findByRole('button', { name: 'settings.application.openScreenRecording' })
		);

		await waitFor(() => {
			expect(window.app.openSystemPreference).toHaveBeenCalledWith('Accessibility');
			expect(window.app.openSystemPreference).toHaveBeenCalledWith('ScreenCapture');
		});
	});
});
