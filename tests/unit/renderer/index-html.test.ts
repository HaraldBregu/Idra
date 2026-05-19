import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('renderer index CSP', () => {
	it('allows recorded audio blob URLs to play in attachment previews', () => {
		const html = readFileSync(resolve(process.cwd(), 'src/renderer/index.html'), 'utf8');

		expect(html).toContain('media-src');
		expect(html).toContain('media-src \'self\' blob: data: local-resource:;');
	});
});
