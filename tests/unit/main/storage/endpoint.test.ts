import { normalizeEndpoint } from '../../../../src/main/storage/endpoint';

describe('normalizeEndpoint', () => {
	it('removes the configured bucket from the end of an S3 endpoint', () => {
		expect(
			normalizeEndpoint('https://account.r2.cloudflarestorage.com/idra-storage', 'idra-storage')
		).toBe('https://account.r2.cloudflarestorage.com');
		expect(
			normalizeEndpoint(
				'https://account.r2.cloudflarestorage.com/idra-storage/',
				'idra-storage'
			)
		).toBe('https://account.r2.cloudflarestorage.com');
	});

	it('preserves endpoints that do not include the configured bucket', () => {
		expect(normalizeEndpoint('https://account.r2.cloudflarestorage.com', 'idra-storage')).toBe(
			'https://account.r2.cloudflarestorage.com'
		);
	});
});
