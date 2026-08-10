import { net } from 'electron';
import type { UrlMetadata } from '../shared/app_types';
import { metadata } from './metadata';
import { publicUrl } from './public';

export async function unfurlUrl(value: string): Promise<UrlMetadata> {
	let url = await publicUrl(value);
	for (let redirects = 0; redirects <= 5; redirects += 1) {
		const response = await net.fetch(url.toString(), {
			headers: { Accept: 'text/html,application/xhtml+xml' },
			redirect: 'manual',
		});
		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location || redirects === 5) throw new Error('Too many redirects.');
			url = await publicUrl(new URL(location, url).toString());
			continue;
		}
		if (!response.ok) throw new Error(`URL returned ${response.status}.`);
		const length = Number(response.headers.get('content-length') ?? 0);
		if (length > 1_000_000) throw new Error('Page is too large.');
		const html = (await response.text()).slice(0, 1_000_000);
		return metadata(html, url);
	}
	throw new Error('Unable to load URL.');
}
