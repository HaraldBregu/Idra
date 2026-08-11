import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PersonaPage from '../../../src/renderer/src/pages/settings/pages/general/persona/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

jest.mock('@/components/persona', () => ({
	Persona: ({ state, level }: { state: string; level: number }) => (
		<div role="img" aria-label="Persona preview" data-state={state} data-level={level} />
	),
}));

it('previews each persona state', async () => {
	const user = userEvent.setup();
	render(<PersonaPage />);

	const preview = screen.getByRole('img', { name: 'Persona preview' });
	expect(preview).toHaveAttribute('data-state', 'idle');

	await user.click(screen.getByRole('button', { name: 'settings.persona.states.speaking' }));

	expect(preview).toHaveAttribute('data-state', 'speaking');
});

it('feeds randomized voice levels to the listening preview', () => {
	jest.useFakeTimers();
	jest.spyOn(Math, 'random').mockReturnValue(0.75);

	try {
		render(<PersonaPage />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.persona.states.listening' }));

		const preview = screen.getByRole('img', { name: 'Persona preview' });
		expect(preview).toHaveAttribute('data-state', 'listening');
		expect(preview).toHaveAttribute('data-level', '0.28');

		act(() => jest.advanceTimersByTime(120));

		expect(Number(preview.getAttribute('data-level'))).toBeCloseTo(0.695);
	} finally {
		jest.useRealTimers();
		jest.restoreAllMocks();
	}
});
