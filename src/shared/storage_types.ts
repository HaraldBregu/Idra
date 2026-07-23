export interface StorageConfig {
	id: string;
	name: string;
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	forcePathStyle: boolean;
	paths: string[];
	/** Minutes between automatic syncs for this provider. 0 disables automatic sync. */
	syncIntervalMinutes: number;
}

export interface StorageSyncFolder {
	key: 'library' | 'notes';
	path: string;
}

export interface StorageObjectInfo {
	key: string;
	size: number;
	lastModified: string | undefined;
}

export interface StorageTestResult {
	ok: boolean;
	error?: string;
}

export interface StorageSyncResult {
	uploaded: string[];
	skipped: string[];
}

export interface StoragePushFailure {
	path: string;
	error: string;
}

export interface StoragePushResult {
	uploaded: string[];
	failed: StoragePushFailure[];
}

export interface StoragePullResult {
	downloaded: string[];
	skipped: string[];
	failed: StoragePushFailure[];
}
