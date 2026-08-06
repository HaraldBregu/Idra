import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../../../src/renderer/src/pages/settings/Layout';
import { SETTINGS_NAVIGATION } from '../../../src/renderer/src/pages/settings/navigation';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

it.each([
	['/settings/knowledge-base', 'settings.rag.title'],
	['/settings/llm-wiki', 'settings.wiki.title'],
])('uses the canonical %s route and breadcrumb', (path, labelKey) => {
	expect(SETTINGS_NAVIGATION).toContainEqual(expect.objectContaining({ path, labelKey }));

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
