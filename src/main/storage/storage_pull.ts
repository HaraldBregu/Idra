import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoragePullResult } from '../../shared/storage_types';
import { describeStorageError } from './storage_error';
import { getObject } from './storage_get';
import { listObjects } from './storage_list';
import { getStorageConfiguration } from './storage_store';
import { walkFiles } from './storage_walk';

// ponytail: full replace mirror — downloads everything, deletes local extras; diff-only if bandwidth matters
export async function pullFiles(id: string): Promise<StoragePullResult> {
	const paths = getStorageConfiguration().paths;
	const downloaded: string[] = [];
	const failed: StoragePullResult['failed'] = [];

	for (const entryPath of paths) {
		const prefix = `${path.basename(entryPath)}/`;
		try {
			const remote = (await listObjects(id, prefix)).filter((item) => !item.key.endsWith('/'));
			const remoteKeys = new Set(remote.map((item) => item.key));
			for (const item of remote) {
				const target = path.join(entryPath, ...item.key.slice(prefix.length).split('/'));
				if (!target.startsWith(entryPath + path.sep)) continue;
				try {
					await fs.mkdir(path.dirname(target), { recursive: true });
					await fs.writeFile(target, await getObject(id, item.key));
					downloaded.push(item.key);
				} catch (error) {
					failed.push({ path: item.key, error: describeStorageError(error) });
				}
			}
			for (const file of await walkFiles(entryPath).catch(() => [])) {
				const key = prefix + path.relative(entryPath, file).split(path.sep).join('/');
				if (!remoteKeys.has(key)) await fs.rm(file, { force: true });
			}
		} catch (error) {
			failed.push({ path: entryPath, error: describeStorageError(error) });
		}
	}

	return { downloaded, skipped: [], failed };
}
