import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { WikiSourceRecord } from './wiki_types';

export async function readWikiArchive(
	record: WikiSourceRecord,
	signal?: AbortSignal
): Promise<string> {
	signal?.throwIfAborted();
	const bytes = await readFile(record.archivePath, { signal });
	const checksum = createHash('sha256').update(bytes).digest('hex');
	if (checksum !== record.checksum) {
		throw new Error(`Immutable source archive checksum mismatch: ${record.sourceId}`);
	}
	return bytes.toString('utf8');
}
