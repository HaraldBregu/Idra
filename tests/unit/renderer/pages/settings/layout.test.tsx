import { render, screen } from '@testing-library/react';
import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, { TextDecoder, TextEncoder });

const { MemoryRouter, Route, Routes } = require('react-router-dom') as typeof import('react-router-dom');
const { Layout } = require('../../../../../src/renderer/src/pages/settings') as typeof import('../../../../../src/renderer/src/pages/settings');

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
	it('shows the current settings page and a General link', () => {
		renderSettings('/settings/cron');

		expect(screen.getByText('settings.tabs.cron')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'settings.tabs.general' }).length).toBeGreaterThan(0);
	});
});
