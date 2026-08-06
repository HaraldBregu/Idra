import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CloudPage from '../../../src/renderer/src/pages/settings/pages/cloud/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) =>
			({
				'settings.tabs.cloud': 'Cloud',
				'settings.overview.descriptions.cloud': 'Cloud storage and sync',
				'settings.storage.configurationTitle': 'Object Storage Configuration',
				'settings.storage.description': 'Configure S3-compatible storage providers.',
			})[key] ?? key,
	}),
}));

it('opens object storage configuration from the Cloud page', async () => {
	const user = userEvent.setup();
	render(
		<MemoryRouter initialEntries={['/settings/cloud']}>
			<Routes>
				<Route path="/settings/cloud" element={<CloudPage />} />
				<Route path="/settings/cloud/storage" element={<p>Storage route</p>} />
			</Routes>
		</MemoryRouter>
	);

	await user.click(screen.getByRole('button', { name: /Object Storage Configuration/ }));

	expect(await screen.findByText('Storage route')).toBeInTheDocument();
});
