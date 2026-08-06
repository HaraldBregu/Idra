import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { WikiRegisteredSource, WikiSource } from './wiki_types';
import { wikiPaths } from './wiki_paths';
import { wikiSourceStore } from './wiki_source_store';
import { assertWikiSourceSafe } from './wiki_source_safety';

export async function registerWikiSource(
	source: WikiSource,
	operationId: string,
	evidenceRoot = wikiPaths().evidence
): Promise<WikiRegisteredSource> {
	assertWikiSourceSafe(source);
	const sourceId = `source-${source.hash.slice(0, 16)}`;
	const registry = wikiSourceStore.store;
	const existing = registry.sources[sourceId];
	if (existing) {
		if (!existing.relativePaths.includes(source.relativePath)) {
			registry.sources[sourceId] = {
				...existing,
				relativePaths: [...existing.relativePaths, source.relativePath].sort(),
			};
			wikiSourceStore.store = registry;
		}
		return {
			source: {
				...source,
				sourceId,
				mediaType: existing.mediaType,
				createdAt: existing.createdAt,
				archivePath: existing.archivePath,
			},
			record: registry.sources[sourceId],
			isNew: false,
		};
	}

	const bytes = await readFile(source.absolutePath);
	const checksum = createHash('sha256').update(bytes).digest('hex');
	if (checksum !== source.hash) throw new Error(`Source changed while it was being registered: ${source.relativePath}`);
	const originalName = path.basename(source.relativePath).replace(/[^a-zA-Z0-9._-]+/g, '-');
	const archiveDirectory = path.resolve(evidenceRoot, sourceId);
	const archivePath = path.resolve(archiveDirectory, originalName || 'source.txt');
	await mkdir(archiveDirectory, { recursive: true });
	await writeFile(archivePath, bytes, { flag: 'wx' }).catch(async (error: NodeJS.ErrnoException) => {
		if (error.code !== 'EEXIST') throw error;
		const archived = await readFile(archivePath);
		if (createHash('sha256').update(archived).digest('hex') !== checksum) {
			throw new Error(`Immutable source archive checksum mismatch: ${sourceId}`);
		}
	});
	const now = new Date().toISOString();
	const record = {
		sourceId,
		checksum,
		originalName,
		relativePaths: [source.relativePath],
		mediaType: source.mediaType ?? 'text/plain',
		createdAt: source.createdAt ?? now,
		ingestedAt: now,
		archivePath,
		status: 'pending' as const,
		operationId,
	};
	wikiSourceStore.store = {
		version: 1,
		sources: { ...registry.sources, [sourceId]: record },
	};
	return {
		source: { ...source, sourceId, archivePath },
		record,
		isNew: true,
	};
}
