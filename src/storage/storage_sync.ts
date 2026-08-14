import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StorageSyncResult } from '../shared/storage_types';
import { listObjects } from './storage_list';
import { putObject } from './storage_put';
import { walkFiles } from './storage_walk';

// ponytail: upload-only mirror with size-only diff; add download direction / checksums if content drift matters
export async function syncDirectory(
	id: string,
	localDir: string,
	prefix = ''
): Promise<StorageSyncResult> {
	const remote = new Map((await listObjects(id, prefix)).map((item) => [item.key, item.size]));
	const uploaded: string[] = [];
	const skipped: string[] = [];
	for (const file of await walkFiles(localDir)) {
		const key = prefix + path.relative(localDir, file).split(path.sep).join('/');
		const data = await fs.readFile(file);
		if (remote.get(key) === data.byteLength) {
			skipped.push(key);
			continue;
		}
		await putObject(id, key, data);
		uploaded.push(key);
	}
	return { uploaded, skipped };
}
