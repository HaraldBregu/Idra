export interface StorageConfig {
	id: string;
	name: string;
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	forcePathStyle: boolean;
	filePaths: string[];
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
