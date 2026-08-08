import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getWikiSettings } from './wiki_get_settings';
import { getWikiRepository, type WikiRepository } from './wiki_repository';
import type { WikiRegisteredSource, WikiSource } from './wiki_types';
import { MAX_WIKI_SOURCE_BYTES } from './wiki_source_limits';
import { assertWikiSourceSafe } from './wiki_source_safety';

export async function registerWikiSource(
	source: WikiSource,
	operationId: string,
	repository: WikiRepository = getWikiRepository(getWikiSettings().targetPath)
): Promise<WikiRegisteredSource> {
	const evidenceRoot = repository.paths.evidence;
	const bytes = await readFile(source.absolutePath);
	if (bytes.length > MAX_WIKI_SOURCE_BYTES) {
		throw new Error(
			`Refusing to ingest oversized source (${bytes.length} bytes; maximum ${MAX_WIKI_SOURCE_BYTES}): ${source.relativePath}`
		);
	}
	const content = bytes.toString('utf8');
	assertWikiSourceSafe({ relativePath: source.relativePath, content });
	const checksum = createHash('sha256').update(bytes).digest('hex');
	if (checksum !== source.hash)
		throw new Error(`Source changed while it was being registered: ${source.relativePath}`);
	const verifiedSource = { ...source, content };
	const sourceId = `source-${checksum.slice(0, 16)}`;
	const registry = repository.sources.store;
	const existing = registry.sources[sourceId];
	if (existing) {
		if (!existing.relativePaths.includes(source.relativePath)) {
			registry.sources[sourceId] = {
				...existing,
				relativePaths: [...existing.relativePaths, source.relativePath].sort(),
			};
			repository.sources.store = registry;
		}
			return {
				source: {
					...verifiedSource,
				sourceId,
				mediaType: existing.mediaType,
				createdAt: existing.createdAt,
				archivePath: existing.archivePath,
			},
			record: registry.sources[sourceId],
			isNew: false,
		};
	}

	const originalName = path.basename(source.relativePath).replace(/[^a-zA-Z0-9._-]+/g, '-');
	const archiveDirectory = path.resolve(evidenceRoot, sourceId);
	const archivePath = path.resolve(archiveDirectory, originalName || 'source.txt');
	await mkdir(archiveDirectory, { recursive: true });
	await writeFile(archivePath, bytes, { flag: 'wx' }).catch(
		async (error: NodeJS.ErrnoException) => {
			if (error.code !== 'EEXIST') throw error;
			const archived = await readFile(archivePath);
			if (createHash('sha256').update(archived).digest('hex') !== checksum) {
				throw new Error(`Immutable source archive checksum mismatch: ${sourceId}`);
			}
		}
	);
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
	repository.sources.store = {
		version: 1,
		sources: { ...registry.sources, [sourceId]: record },
	};
	return {
		source: { ...verifiedSource, sourceId, archivePath },
		record,
		isNew: true,
	};
}
