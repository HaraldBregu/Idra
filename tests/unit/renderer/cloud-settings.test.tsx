import { render, screen } from '@testing-library/react';
import CloudPage from '../../../src/renderer/src/pages/settings/pages/cloud/Page';

jest.mock('../../../src/renderer/src/pages/settings/pages/storage/Page', () => ({
	__esModule: true,
	default: ({ embedded }: { readonly embedded?: boolean }) => (
		<p>{embedded ? 'Embedded storage configuration' : 'Standalone storage configuration'}</p>
	),
}));

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

it('renders object storage configuration inside the Cloud page', () => {
	render(<CloudPage />);

	expect(screen.getByRole('heading', { name: 'Cloud' })).toBeInTheDocument();
	expect(screen.getByText('Object Storage Configuration')).toBeInTheDocument();
	expect(screen.getByText('Embedded storage configuration')).toBeInTheDocument();
});
