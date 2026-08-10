import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../../src/renderer/src/pages/settings/Layout';
import {
	SETTINGS_DETAIL_ITEMS,
	SETTINGS_NAVIGATION,
} from '../../../src/renderer/src/pages/settings/navigation';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

beforeEach(() => {
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

it.each([
	['/settings/knowledge-base', 'settings.rag.title'],
	['/settings/llm-wiki', 'settings.wiki.title'],
	['/settings/tasks', 'settings.tabs.taskScheduler'],
	['/settings/assistant/permissions', 'settings.tabs.permissions'],
	['/settings/assistant/data', 'settings.dataControls.title'],
	['/settings/tasks/permissions', 'settings.permissions.scopes.tasksTitle'],
	['/settings/channels/permissions', 'settings.permissions.scopes.channelsTitle'],
	['/settings/assistant/health/permissions', 'settings.permissions.scopes.healthTitle'],
])('uses the canonical %s route and breadcrumb', (path, labelKey) => {
	if (path === '/settings/assistant/data') {
		expect(SETTINGS_DETAIL_ITEMS).toContainEqual(expect.objectContaining({ path, labelKey }));
	} else if (!path.endsWith('/permissions') || path === '/settings/assistant/permissions') {
		expect(SETTINGS_NAVIGATION).toContainEqual(expect.objectContaining({ path, labelKey }));
	}

	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings" element={<Layout />}>
					<Route path="*" element={<p>Settings page</p>} />
				</Route>
			</Routes>
		</MemoryRouter>
	);

	const breadcrumb = screen.getByRole('navigation', { name: 'settings.breadcrumb.label' });
	expect(within(breadcrumb).getByText(labelKey)).toBeInTheDocument();
});
