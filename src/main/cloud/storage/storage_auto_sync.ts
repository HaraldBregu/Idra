import type { StorageConfig } from '../../../shared/storage_types';
import { getStorages } from './storage_store';
import { pushFiles } from './storage_push';
import type { StorageSyncLogger } from './storage_sync_types';

function isSyncable(storage: StorageConfig): boolean {
	return Boolean(
		storage.bucket && storage.accessKeyId && storage.secretAccessKey && storage.paths.length > 0
	);
}

export async function runAutoSync(logger: StorageSyncLogger): Promise<void> {
	const storages = getStorages().filter(isSyncable);
	for (const storage of storages) {
		try {
			const result = await pushFiles(storage.id);
			const failedSuffix = result.failed.length ? `, ${result.failed.length} failed` : '';
			logger.info(
				'Storage',
				`Auto sync "${storage.name}" uploaded ${result.uploaded.length} file(s)${failedSuffix}`
			);
		} catch (error) {
			logger.error('Storage', `Auto sync failed for "${storage.name}"`, error);
		}
	}
}
