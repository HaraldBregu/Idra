export interface FileStorageConfig {
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

export interface FileStorageObjectInfo {
	key: string;
	size: number;
	lastModified: string | undefined;
}

export interface FileStorageTestResult {
	ok: boolean;
	error?: string;
}

export interface FileStorageSyncResult {
	uploaded: string[];
	skipped: string[];
}

export interface FileStoragePushFailure {
	path: string;
	error: string;
}

export interface FileStoragePushResult {
	uploaded: string[];
	failed: FileStoragePushFailure[];
}
