import type { UrlMetadata } from 'shared/app_types';
import { metaContent } from './meta';

export function metadata(html: string, pageUrl: URL): UrlMetadata {
	const title =
		metaContent(html, 'og:title') ||
		metaContent(html, 'twitter:title') ||
		html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
		pageUrl.hostname;
	const description =
		metaContent(html, 'og:description') ||
		metaContent(html, 'twitter:description') ||
		metaContent(html, 'description');
	const imageValue = metaContent(html, 'og:image') || metaContent(html, 'twitter:image');
	const faviconValue =
		html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
		html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i)?.[1] ||
		'/favicon.ico';
	return {
		title,
		description,
		image: imageValue ? new URL(imageValue, pageUrl).toString() : '',
		favicon: new URL(faviconValue, pageUrl).toString(),
	};
}
