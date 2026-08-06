import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { WikiSource } from './wiki_types';

const WIKI_SOURCE_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.log']);
const MAX_SOURCE_CHARACTERS = 120_000;

export async function collectWikiSources(root: string): Promise<WikiSource[]> {
	const entries = await readdir(root, { recursive: true });
	const sources: WikiSource[] = [];

	for (const entry of entries.sort()) {
		const absolutePath = path.resolve(root, entry);
		const sourceStat = await stat(absolutePath);
		if (!sourceStat.isFile()) continue;
		if (!WIKI_SOURCE_EXTENSIONS.has(path.extname(entry).toLowerCase())) continue;
		const bytes = await readFile(absolutePath);
		const content = bytes.toString('utf8');
		const extension = path.extname(entry).toLowerCase();
		sources.push({
			absolutePath,
			relativePath: entry.split(path.sep).join('/'),
			content: content.slice(0, MAX_SOURCE_CHARACTERS),
			hash: createHash('sha256').update(bytes).digest('hex'),
			mediaType:
				extension === '.md' || extension === '.markdown'
					? 'text/markdown'
					: extension === '.json'
						? 'application/json'
						: extension === '.csv'
							? 'text/csv'
							: 'text/plain',
			createdAt: (sourceStat.birthtimeMs > 0 ? sourceStat.birthtime : sourceStat.mtime).toISOString(),
		});
	}

	return sources;
}
