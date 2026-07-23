import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoragePullResult } from '../../../shared/storage_types';
import { describeStorageError } from './storage_error';
import { getObject } from './storage_get';
import { listObjects } from './storage_list';
import { getStorage } from './storage_store';

// ponytail: size-only diff, mirror of storage_sync push; add checksums if content drift matters
export async function pullFiles(id: string): Promise<StoragePullResult> {
	const config = getStorage(id);
	const paths = config?.paths ?? [];
	const downloaded: string[] = [];
	const skipped: string[] = [];
	const failed: StoragePullResult['failed'] = [];

	for (const entryPath of paths) {
		const prefix = `${path.basename(entryPath)}/`;
		try {
			for (const item of await listObjects(id, prefix)) {
				if (item.key.endsWith('/')) continue;
				const target = path.join(entryPath, ...item.key.slice(prefix.length).split('/'));
				if (!target.startsWith(entryPath + path.sep)) continue;
				try {
					const stat = await fs.stat(target).catch(() => null);
					if (stat?.size === item.size) {
						skipped.push(item.key);
						continue;
					}
					await fs.mkdir(path.dirname(target), { recursive: true });
					await fs.writeFile(target, await getObject(id, item.key));
					downloaded.push(item.key);
				} catch (error) {
					failed.push({ path: item.key, error: describeStorageError(error) });
				}
			}
		} catch (error) {
			failed.push({ path: entryPath, error: describeStorageError(error) });
		}
	}

	return { downloaded, skipped, failed };
}
