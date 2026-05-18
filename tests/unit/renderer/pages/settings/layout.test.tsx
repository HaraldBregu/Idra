import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../../../../src/renderer/src/pages/settings';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function renderSettings(path: string): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings" element={<Layout />}>
					<Route path="general" element={<div>General page</div>} />
					<Route path="cron" element={<div>Cron page</div>} />
				</Route>
			</Routes>
		</MemoryRouter>
	);
}

describe('Settings Layout', () => {
	it('shows the current settings page and settings root link', () => {
		renderSettings('/settings/cron');

		expect(screen.getByText('settings.tabs.cron')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'settings.title' })).toHaveAttribute('href', '/settings');
	});
});
