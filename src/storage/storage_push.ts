import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoragePushResult } from '../../shared/storage_types';
import { deleteObject } from './storage_delete';
import { describeStorageError } from './storage_error';
import { listObjects } from './storage_list';
import { putObject } from './storage_put';
import { getStorageConfiguration } from './storage_store';
import { walkFiles } from './storage_walk';

// ponytail: full replace mirror — uploads everything, deletes remote extras; diff-only if bandwidth matters
export async function pushFiles(id: string): Promise<StoragePushResult> {
	const paths = getStorageConfiguration().paths;
	const uploaded: string[] = [];
	const failed: StoragePushResult['failed'] = [];

	const uploadFile = async (filePath: string, key: string): Promise<void> => {
		try {
			const data = await fs.readFile(filePath);
			await putObject(id, key, data);
			uploaded.push(filePath);
		} catch (error) {
			failed.push({ path: filePath, error: describeStorageError(error) });
		}
	};

	for (const entryPath of paths) {
		try {
			const stat = await fs.stat(entryPath);
			if (stat.isDirectory()) {
				const folderName = path.basename(entryPath);
				const localKeys = new Set<string>();
				for (const file of await walkFiles(entryPath)) {
					const relative = path.relative(entryPath, file).split(path.sep).join('/');
					const key = `${folderName}/${relative}`;
					localKeys.add(key);
					await uploadFile(file, key);
				}
				for (const item of await listObjects(id, `${folderName}/`)) {
					if (!localKeys.has(item.key)) await deleteObject(id, item.key);
				}
			} else {
				await uploadFile(entryPath, path.basename(entryPath));
			}
		} catch (error) {
			failed.push({ path: entryPath, error: describeStorageError(error) });
		}
	}

	return { uploaded, failed };
}
