import { createHash } from 'node:crypto';
import path from 'node:path';
import type { WikiSource } from './wiki_types';

export function wikiSourcePage(source: WikiSource): string {
	const stem = source.relativePath
		.slice(0, -path.extname(source.relativePath).length)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
	const pathHash = createHash('sha256').update(source.relativePath).digest('hex').slice(0, 8);
	return `sources/${stem || 'source'}-${pathHash}.md`;
}
