export interface CloudConfig {
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	forcePathStyle: boolean;
	filePaths: string[];
}

export interface CloudObjectInfo {
	key: string;
	size: number;
	lastModified: string | undefined;
}

export interface CloudTestResult {
	ok: boolean;
	error?: string;
}

export interface CloudSyncResult {
	uploaded: string[];
	skipped: string[];
}

export interface CloudPushFailure {
	path: string;
	error: string;
}

export interface CloudPushResult {
	uploaded: string[];
	failed: CloudPushFailure[];
}
