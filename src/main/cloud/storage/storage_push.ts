import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoragePushResult } from '../../../shared/storage_types';
import { describeStorageError } from './storage_error';
import { putObject } from './storage_put';
import { getStorage } from './storage_store';
import { walkFiles } from './storage_walk';

export async function pushFiles(id: string): Promise<StoragePushResult> {
	const config = getStorage(id);
	const paths = config?.paths ?? [];
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
				for (const file of await walkFiles(entryPath)) {
					const relative = path.relative(entryPath, file).split(path.sep).join('/');
					await uploadFile(file, `${folderName}/${relative}`);
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
