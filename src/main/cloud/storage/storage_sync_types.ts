export interface StorageSyncSettings {
	intervalMinutes: number;
}

export const DEFAULT_STORAGE_SYNC_SETTINGS: StorageSyncSettings = {
	intervalMinutes: 24 * 60,
};

export interface StorageSyncLogger {
	info(source: string, message: string, data?: unknown): void;
	error(source: string, message: string, data?: unknown): void;
}
