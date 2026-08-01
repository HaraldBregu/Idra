import { parseProviderManifest, validateProviderManifest } from '../../../../src/shared/providers/validation';

describe('provider manifest validation', () => {
	it('rejects invalid service types and accepts supported manifest services', () => {
		const manifest = {
			providerId: 'acme',
			providerName: 'Acme',
			services: [
				{
					id: 'acme-chat',
					name: 'Acme Chat',
					type: 'large-language-model',
					url: 'https://api.acme.test/v1',
				},
			],
		};

		expect(parseProviderManifest(manifest)).toEqual(manifest);
		expect(validateProviderManifest({ ...manifest, services: [{ ...manifest.services[0], type: 'chat' }] })).toEqual([
			expect.stringContaining('services[0].type must be one of'),
		]);
	});
});
