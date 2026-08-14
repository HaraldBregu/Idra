import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandMenu } from '../../../src/renderer/src/experience/CommandMenu';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, fallback?: string): string => fallback ?? key,
	}),
}));

class ResizeObserverMock {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
	configurable: true,
	value: ResizeObserverMock,
});

it.each(['/home', '/home/session/1', '/settings', '/settings/providers/models'])(
	'opens command search on %s',
	(path) => {
		render(
			<MemoryRouter initialEntries={[path]}>
				<CommandMenu />
			</MemoryRouter>
		);

		fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

		expect(screen.getByPlaceholderText('Search routes and settings...')).toBeInTheDocument();
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

		expect(screen.queryByPlaceholderText('Search routes and settings...')).not.toBeInTheDocument();
	}
);
