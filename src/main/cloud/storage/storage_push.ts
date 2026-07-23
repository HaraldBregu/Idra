import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoragePushResult } from '../../../shared/storage_types';
import { describeStorageError } from './storage_error';
import { putObject } from './storage_put';
import { getStorage } from './storage_store';

export async function pushFiles(id: string): Promise<StoragePushResult> {
	const config = getStorage(id);
	const filePaths = config?.filePaths ?? [];
	const uploaded: string[] = [];
	const failed: StoragePushResult['failed'] = [];

	for (const filePath of filePaths) {
		try {
			const data = await fs.readFile(filePath);
			await putObject(id, path.basename(filePath), data);
			uploaded.push(filePath);
		} catch (error) {
			failed.push({ path: filePath, error: describeStorageError(error) });
		}
	}

	return { uploaded, failed };
}
