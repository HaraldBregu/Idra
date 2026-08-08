import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../../src/renderer/src/pages/settings/Layout';
import ExtensionsPage from '../../../src/renderer/src/pages/settings/pages/extensions/Page';
import type { Extension } from '../../../src/shared/extension_types';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, values?: Record<string, string>): string =>
			values ? `${key} ${JSON.stringify(values)}` : key,
	}),
}));

const extensions: Extension[] = [
	{
		id: 'demo-extension',
		title: 'Demo Extension',
		description: 'A demo extension.',
		metadata: {
			version: '1.0.0',
			category: 'Demo',
			entry: 'index.html',
		},
	},
];

beforeEach(() => {
	Object.defineProperty(window, 'extensions', {
		configurable: true,
		value: {
			list: jest.fn().mockResolvedValue(extensions),
			open: jest.fn(),
			openFolder: jest.fn(),
			import: jest.fn(),
		},
	});
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: jest.fn((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		})),
	});
});

it('opens the extensions folder from the page header', async () => {
	const user = userEvent.setup();

	render(
		<MemoryRouter initialEntries={['/settings/extensions']}>
			<Routes>
				<Route path="/settings" element={<Layout />}>
					<Route path="extensions" element={<ExtensionsPage />} />
				</Route>
			</Routes>
		</MemoryRouter>
	);

	await user.click(screen.getByRole('button', { name: 'settings.extensions.openFolder' }));

	expect(window.extensions.openFolder).toHaveBeenCalledTimes(1);
});

it('navigates extension clicks to the extension detail subroute', async () => {
	const user = userEvent.setup();

	render(
		<MemoryRouter initialEntries={['/settings/extensions']}>
			<Routes>
				<Route path="/settings" element={<Layout />}>
					<Route path="extensions">
						<Route index element={<ExtensionsPage />} />
						<Route path=":extensionId" element={<p>Extension detail</p>} />
					</Route>
				</Route>
			</Routes>
		</MemoryRouter>
	);

	await user.click(await screen.findByRole('button', { name: /Demo Extension/ }));

	expect(await screen.findByText('Extension detail')).toBeInTheDocument();
});

it('treats an extension detail route as a child of the extensions breadcrumb', async () => {
	const user = userEvent.setup();

	render(
		<MemoryRouter initialEntries={['/settings/extensions/demo-extension']}>
			<Routes>
				<Route path="/settings" element={<Layout />}>
					<Route path="extensions">
						<Route index element={<p>Extensions list</p>} />
						<Route path=":extensionId" element={<p>Extension detail</p>} />
					</Route>
				</Route>
			</Routes>
		</MemoryRouter>
	);

	const breadcrumb = screen.getByRole('navigation', { name: 'settings.breadcrumb.label' });
	expect(within(breadcrumb).getByText('demo-extension')).toBeInTheDocument();

	await user.click(within(breadcrumb).getByRole('link', { name: 'settings.tabs.extensions' }));
	expect(await screen.findByText('Extensions list')).toBeInTheDocument();
});
