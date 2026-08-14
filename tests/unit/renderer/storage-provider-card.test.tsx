import { render } from '@testing-library/react';
import { ProviderCard } from '../../../src/renderer/src/pages/settings/pages/storage/ProviderCard';

it('uses the catalog provider icon for a built-in storage provider', () => {
	const { container } = render(
		<ProviderCard
			storage={{
				id: 'cloudflare',
				name: 'Cloudflare',
				endpoint: 'https://r2.cloudflarestorage.com',
				region: 'us-east-1',
				accessKeyId: '',
				secretAccessKey: '',
				bucket: '',
				forcePathStyle: false,
			}}
			provider={{
				id: 'cloudflare',
				name: 'Cloudflare',
				baseUrl: 'https://r2.cloudflarestorage.com',
				iconDarkUrl: 'local-resource://cloudflare-dark.png',
				iconLightUrl: 'local-resource://cloudflare-light.png',
			}}
			onSaved={() => {}}
			onRemoved={() => {}}
		/>
	);

	expect(Array.from(container.querySelectorAll('img')).map((image) => image.getAttribute('src'))).toEqual([
		'local-resource://cloudflare-light.png',
		'local-resource://cloudflare-dark.png',
	]);
});
