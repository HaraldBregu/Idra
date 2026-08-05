import cron, { type ScheduledTask } from 'node-cron';
import { isAutoSyncable, runProviderSync } from './storage_auto_sync';
import { getStorage, getStorageConfiguration } from './storage_store';
import type { StorageSyncLogger } from './storage_sync_types';

let task: ScheduledTask | undefined;
let syncLogger: StorageSyncLogger | undefined;

export function startStorageSync(logger: StorageSyncLogger): void {
	syncLogger = logger;
	schedule();
}

export function stopStorageSync(): void {
	task?.destroy();
	task = undefined;
	syncLogger = undefined;
}

export function rescheduleStorageSync(): void {
	if (syncLogger) schedule();
}

function schedule(): void {
	task?.destroy();
	task = undefined;
	const logger = syncLogger;
	if (!logger) return;
	const configuration = getStorageConfiguration();
	const storage = configuration.providerId ? getStorage(configuration.providerId) : undefined;
	if (!storage || !isAutoSyncable(storage, configuration)) return;
	if (!cron.validate(configuration.syncCronExpression)) {
		logger.error('Storage', `Invalid sync schedule for "${storage.name}"`);
		return;
	}
	logger.info(
		'Storage',
		`Auto sync "${storage.name}" scheduled with ${configuration.syncCronExpression}`
	);
	task = cron.schedule(
		configuration.syncCronExpression,
		async () => {
			await runProviderSync(storage, logger);
		},
		{ noOverlap: true }
	);
}
