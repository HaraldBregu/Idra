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
	['settings.title', '/settings'],
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
