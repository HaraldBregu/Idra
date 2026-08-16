import { load } from 'cheerio';

export function extractWebsite(html: string, pageUrl: string, maxChars: number, selector?: string) {
	const $ = load(html);
	$('script, style, noscript, template, svg, canvas').remove();
	const scope = selector
		? $(selector)
		: $('main').first().length
			? $('main').first()
			: $('article').first().length
				? $('article').first()
				: $('body');
	if (scope.length === 0) throw new Error(`Website selector did not match: ${selector}`);
	scope.find('br').replaceWith('\n');
	scope.find('p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, tr').append('\n');
	const text = scope
		.text()
		.replace(/[^\S\n]+/g, ' ')
		.replace(/ *\n */g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	const links = scope
		.find('a[href]')
		.slice(0, 100)
		.map((_, element) => {
			const href = $(element).attr('href');
			if (!href) return undefined;
			try {
				const url = new URL(href, pageUrl);
				if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
				return { text: $(element).text().replace(/\s+/g, ' ').trim(), url: url.toString() };
			} catch {
				return undefined;
			}
		})
		.get()
		.filter((link): link is { text: string; url: string } => link !== undefined);
	return {
		title: $('title').first().text().replace(/\s+/g, ' ').trim(),
		text: text.length > maxChars ? `${text.slice(0, maxChars).trimEnd()}\n[truncated]` : text,
		links,
	};
}
