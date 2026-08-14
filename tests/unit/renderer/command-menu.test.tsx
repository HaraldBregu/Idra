import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandMenu } from '../../../src/renderer/src/experience/CommandMenu';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, fallback?: string): string => fallback ?? key,
	}),
}));

it.each(['/home', '/home/session/1', '/settings', '/settings/providers/models'])(
	'opens command search on %s',
	(path) => {
		render(
			<MemoryRouter initialEntries={[path]}>
				<CommandMenu />
			</MemoryRouter>
		);

		fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

		expect(screen.getByRole('dialog', { name: 'Route search' })).toBeInTheDocument();
	}
);

it.each(['/start', '/homepage', '/settings-old'])(
	'does not open command search on %s',
	(path) => {
		render(
			<MemoryRouter initialEntries={[path]}>
				<CommandMenu />
			</MemoryRouter>
		);

		fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

		expect(screen.queryByRole('dialog', { name: 'Route search' })).not.toBeInTheDocument();
	}
);
