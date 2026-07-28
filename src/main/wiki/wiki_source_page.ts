import path from 'node:path';
import type { WikiSource } from './wiki_types';

export function wikiSourcePage(source: WikiSource): string {
	const stem = source.relativePath
		.slice(0, -path.extname(source.relativePath).length)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
	return `sources/${stem || 'source'}-${source.hash.slice(0, 8)}.md`;
}
