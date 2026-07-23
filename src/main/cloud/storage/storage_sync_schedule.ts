import type { StorageConfig } from '../../../shared/storage_types';
import { isAutoSyncable, runProviderSync } from './storage_auto_sync';
import { getStorages } from './storage_store';
import type { StorageSyncLogger } from './storage_sync_types';

const timers = new Map<string, ReturnType<typeof setInterval>>();
let syncLogger: StorageSyncLogger | undefined;

export function startStorageSync(logger: StorageSyncLogger): void {
	syncLogger = logger;
	scheduleAll();
}

export function stopStorageSync(): void {
	for (const timer of timers.values()) clearInterval(timer);
	timers.clear();
	syncLogger = undefined;
}

export function rescheduleStorageSync(): void {
	if (syncLogger) scheduleAll();
}

function scheduleAll(): void {
	for (const timer of timers.values()) clearInterval(timer);
	timers.clear();
	const logger = syncLogger;
	if (!logger) return;
	for (const storage of getStorages()) {
		scheduleStorage(storage, logger);
	}
}

function scheduleStorage(storage: StorageConfig, logger: StorageSyncLogger): void {
	if (!isAutoSyncable(storage)) return;
	const ms = storage.syncIntervalMinutes * 60_000;
	logger.info(
		'Storage',
		`Auto sync "${storage.name}" scheduled every ${storage.syncIntervalMinutes} minute(s)`
	);
	const timer = setInterval(() => {
		runProviderSync(storage, logger).catch((error) => {
			logger.error('Storage', `Auto sync failed for "${storage.name}"`, error);
		});
	}, ms);
	timer.unref();
	timers.set(storage.id, timer);
}
