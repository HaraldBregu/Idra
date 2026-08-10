import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import type { WikiSource } from './types';
import { assertWikiSourceSafe } from '../safety';
import { MAX_WIKI_SOURCE_BYTES } from './wiki_source_limits';

const WIKI_SOURCE_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.log']);

export async function collectWikiSources(root: string, signal?: AbortSignal): Promise<WikiSource[]> {
	signal?.throwIfAborted();
	const sourceRoot = await realpath(root);
	const entries = await readdir(sourceRoot, { recursive: true });
	const sources: WikiSource[] = [];

	for (const entry of entries.sort()) {
		signal?.throwIfAborted();
		const candidatePath = path.resolve(sourceRoot, entry);
		const candidateStat = await lstat(candidatePath);
		const absolutePath = await realpath(candidatePath);
		const relativeTarget = path.relative(sourceRoot, absolutePath);
		if (
			path.isAbsolute(relativeTarget) ||
			relativeTarget === '..' ||
			relativeTarget.startsWith(`..${path.sep}`)
		) {
			const relativePath = entry.split(path.sep).join('/');
			throw new Error(
				candidateStat.isSymbolicLink()
					? `Refusing to ingest source symlink outside the configured wiki folder: ${relativePath}`
					: `Refusing to ingest source outside the configured wiki folder: ${relativePath}`
			);
		}
		const sourceStat = candidateStat.isSymbolicLink() ? await stat(absolutePath) : candidateStat;
		if (!sourceStat.isFile()) continue;
		if (!WIKI_SOURCE_EXTENSIONS.has(path.extname(entry).toLowerCase())) continue;
		const bytes = await readFile(absolutePath, { signal });
		if (bytes.length > MAX_WIKI_SOURCE_BYTES) {
			throw new Error(
				`Refusing to ingest oversized source (${bytes.length} bytes; maximum ${MAX_WIKI_SOURCE_BYTES}): ${entry}`
			);
		}
		const content = bytes.toString('utf8');
		const relativePath = entry.split(path.sep).join('/');
		assertWikiSourceSafe({ relativePath, content });
		const extension = path.extname(entry).toLowerCase();
		sources.push({
			absolutePath,
			relativePath,
			content,
			hash: createHash('sha256').update(bytes).digest('hex'),
			mediaType:
				extension === '.md' || extension === '.markdown'
					? 'text/markdown'
					: extension === '.json'
						? 'application/json'
						: extension === '.csv'
							? 'text/csv'
							: 'text/plain',
			createdAt: (sourceStat.birthtimeMs > 0
				? sourceStat.birthtime
				: sourceStat.mtime
			).toISOString(),
		});
	}

	return sources;
}
