import { runAutoSync } from './storage_auto_sync';
import { getStorageSyncSettings } from './storage_store';
import type { StorageSyncLogger } from './storage_sync_types';

let timer: ReturnType<typeof setInterval> | undefined;
let syncLogger: StorageSyncLogger | undefined;

export function startStorageSync(logger: StorageSyncLogger): void {
	syncLogger = logger;
	schedule();
}

export function stopStorageSync(): void {
	if (timer) clearInterval(timer);
	timer = undefined;
	syncLogger = undefined;
}

export function rescheduleStorageSync(): void {
	if (syncLogger) schedule();
}

function schedule(): void {
	if (timer) clearInterval(timer);
	timer = undefined;
	const logger = syncLogger;
	const { intervalMinutes } = getStorageSyncSettings();
	const ms = intervalMinutes * 60_000;
	if (!ms || !logger) {
		logger?.info('Storage', 'Automatic sync disabled');
		return;
	}
	logger.info('Storage', `Automatic sync scheduled every ${intervalMinutes} minute(s)`);
	timer = setInterval(() => {
		runAutoSync(logger).catch((error) => {
			logger.error('Storage', 'Automatic sync failed', error);
		});
	}, ms);
	timer.unref();
}
