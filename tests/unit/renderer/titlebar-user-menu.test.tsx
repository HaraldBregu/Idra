import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserMenu } from '../../../src/renderer/src/components/app/titlebar/components/UserMenu';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

it.each([
	['settings.tabs.general', '/settings/general'],
	['settings.overview.groups.agent', '/settings/assistant'],
	['settings.tabs.system', '/settings/system'],
	['settings.tabs.extensions', '/settings/extensions'],
	['settings.overview.backToSettings', '/settings'],
])('navigates from %s to %s', async (label, path) => {
	const user = userEvent.setup();

	render(
		<MemoryRouter initialEntries={['/home']}>
			<UserMenu align="end" />
			<Routes>
				<Route path={path} element={<p>{path}</p>} />
			</Routes>
		</MemoryRouter>
	);

	await user.click(screen.getByRole('button', { name: 'settings.title' }));
	await user.click(await screen.findByRole('menuitem', { name: label }));

	expect(screen.getByText(path)).toBeInTheDocument();
});
