import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GeneralPage from '../../../src/renderer/src/pages/settings/pages/general/Page';

const mockSetTheme = jest.fn();
const mockSetPersona = jest.fn();

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

jest.mock('@/contexts', () => ({
	useApp: () => ({
		language: 'en',
		setLanguage: jest.fn(),
		persona: 'halo',
		setPersona: mockSetPersona,
		theme: 'system',
		setTheme: mockSetTheme,
	}),
}));

jest.mock('@/components/ai-elements/persona', () => ({
	Persona: () => null,
}));

beforeAll(() => {
	Object.defineProperty(globalThis, '__APP_NAME__', { configurable: true, value: 'Friday' });
	Object.defineProperty(globalThis, '__APP_VERSION__', { configurable: true, value: '1.0.0' });
});

beforeEach(() => {
	mockSetTheme.mockClear();
	mockSetPersona.mockClear();
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: {
			getTrayEnabled: jest.fn().mockResolvedValue(true),
			getKeepAwake: jest.fn().mockResolvedValue(false),
		},
	});
});

it('changes the application theme from General settings', async () => {
	const user = userEvent.setup();
	render(<GeneralPage />);

	expect(screen.getByRole('button', { name: 'System theme' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await user.click(screen.getByRole('button', { name: 'Dark theme' }));

	expect(mockSetTheme).toHaveBeenCalledWith('dark');
});

it('changes the persona from General settings', async () => {
	const user = userEvent.setup();
	render(<GeneralPage />);

	const selector = await screen.findByRole('combobox', { name: 'settings.persona.title' });
	await waitFor(() => expect(selector).toHaveTextContent('settings.persona.halo'));
	await user.click(selector);
	await user.click(await screen.findByRole('option', { name: 'settings.persona.glint' }));

	expect(mockSetPersona).toHaveBeenCalledWith('glint');
});
