import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TitleBar } from '../../../src/renderer/src/components/app/titlebar/TitleBar';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

jest.mock('@/contexts', () => ({
	useApp: () => ({ persona: 'glint' }),
}));

jest.mock('@/components/ai-elements/persona', () => ({
	Persona: ({ variant }: { variant: string }) => (
		<span data-testid="titlebar-persona" data-variant={variant} />
	),
}));

it('renders the selected persona in the titlebar home button', () => {
	render(
		<MemoryRouter initialEntries={['/settings/general']}>
			<TitleBar />
		</MemoryRouter>
	);

	expect(screen.getByRole('button', { name: 'titleBar.home' })).toContainElement(
		screen.getByTestId('titlebar-persona')
	);
	expect(screen.getByTestId('titlebar-persona')).toHaveAttribute('data-variant', 'glint');
});
