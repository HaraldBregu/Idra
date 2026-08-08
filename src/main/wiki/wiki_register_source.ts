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
	repository: WikiRepository = getWikiRepository(getWikiSettings().targetPath),
	signal?: AbortSignal
): Promise<WikiRegisteredSource> {
	signal?.throwIfAborted();
	const evidenceRoot = repository.paths.evidence;
	const bytes = await readFile(source.absolutePath, { signal });
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
	const previous = Object.values(registry.sources)
		.filter(
			(record) =>
				record.sourceId !== sourceId &&
				record.relativePaths.includes(source.relativePath) &&
				!record.lineage?.[source.relativePath]?.replacedBySourceId
		)
		.sort((left, right) => right.ingestedAt.localeCompare(left.ingestedAt))[0];
	const previousVersion = previous?.lineage?.[source.relativePath]?.version ?? (previous ? 1 : 0);
	if (existing) {
		if (!existing.relativePaths.includes(source.relativePath)) {
			registry.sources[sourceId] = {
				...existing,
				relativePaths: [...new Set([...existing.relativePaths, source.relativePath])].sort(),
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
			record: repository.sources.store.sources[sourceId],
			isNew: false,
			...(previous
				? {
						pendingLineage: {
							relativePath: source.relativePath,
							version: previousVersion + 1,
							previousSourceId: previous.sourceId,
						},
					}
				: {}),
		};
	}

	const originalName = path.basename(source.relativePath).replace(/[^a-zA-Z0-9._-]+/g, '-');
	const archiveDirectory = path.resolve(evidenceRoot, sourceId);
	const archivePath = path.resolve(archiveDirectory, originalName || 'source.txt');
	await mkdir(archiveDirectory, { recursive: true });
	signal?.throwIfAborted();
	await writeFile(archivePath, bytes, { flag: 'wx', signal }).catch(
		async (error: NodeJS.ErrnoException) => {
			if (error.code !== 'EEXIST') throw error;
			const archived = await readFile(archivePath, { signal });
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
		...(previous
			? {
					pendingLineage: {
						relativePath: source.relativePath,
						version: previousVersion + 1,
						previousSourceId: previous.sourceId,
					},
				}
			: {}),
	};
}
