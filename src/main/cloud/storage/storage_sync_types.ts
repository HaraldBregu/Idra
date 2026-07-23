export const DEFAULT_SYNC_INTERVAL_MINUTES = 24 * 60;

export interface StorageSyncLogger {
	info(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}
