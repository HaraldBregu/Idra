import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { FileStoragePushResult } from '../../shared/file_storage_types';
import { describeFileStorageError } from './file_storage_error';
import { putObject } from './file_storage_put';
import { getFileStorage } from './file_storage_store';

export async function pushFiles(id: string): Promise<FileStoragePushResult> {
	const config = getFileStorage(id);
	const filePaths = config?.filePaths ?? [];
	const uploaded: string[] = [];
	const failed: FileStoragePushResult['failed'] = [];

	for (const filePath of filePaths) {
		try {
			const data = await fs.readFile(filePath);
			await putObject(id, path.basename(filePath), data);
			uploaded.push(filePath);
		} catch (error) {
			failed.push({ path: filePath, error: describeFileStorageError(error) });
		}
	}

	return { uploaded, failed };
}
