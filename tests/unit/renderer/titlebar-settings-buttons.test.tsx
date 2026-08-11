import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TitleBar } from '../../../src/renderer/src/components/app/titlebar/TitleBar';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

jest.mock('@/components/ui/gradient-sphere', () => ({
	GradientSphere: (): null => null,
}));

it.each([
	['settings.tabs.general', '/settings/general'],
	['settings.overview.groups.agent', '/settings/assistant'],
	['settings.tabs.system', '/settings/system'],
	['settings.tabs.extensions', '/settings/extensions'],
])('reveals settings buttons on right-click and navigates from %s to %s', async (label, path) => {
	const user = userEvent.setup();
	const { container } = render(
		<MemoryRouter initialEntries={['/project']}>
			<TitleBar />
			<Routes>
				<Route path="/project" element={null} />
				<Route path={path} element={<p>{path}</p>} />
			</Routes>
		</MemoryRouter>
	);
	const titleBar = container.querySelector('.app-translucent-surface');

	expect(titleBar).not.toBeNull();
	expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();

	const contextMenuEvent = new MouseEvent('contextmenu', {
		bubbles: true,
		cancelable: true,
	});
	fireEvent(titleBar as Element, contextMenuEvent);

	expect(contextMenuEvent.defaultPrevented).toBe(true);
	expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: label }));

	expect(screen.getByText(path)).toBeInTheDocument();
});

it('shows the history and user icons on Home before right-click', async () => {
	const user = userEvent.setup();

	render(
		<MemoryRouter initialEntries={['/home']}>
			<TitleBar />
			<Routes>
				<Route path="/home" element={null} />
				<Route path="/settings" element={<p>/settings</p>} />
			</Routes>
		</MemoryRouter>
	);

	expect(screen.getByRole('button', { name: 'titleBar.chatHistory' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'settings.title' })).toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'settings.tabs.general' })).not.toBeInTheDocument();

	await user.click(screen.getByRole('button', { name: 'settings.title' }));

	expect(screen.getByText('/settings')).toBeInTheDocument();
});
