import { S3Client } from '@aws-sdk/client-s3';
import type { StorageConfig } from '../../../shared/storage_types';
import { getStorage } from './storage_store';

const isR2Endpoint = (endpoint: string): boolean => /\.r2\.cloudflarestorage\.com(\/|$)/i.test(endpoint);

export function createStorageClient(config: StorageConfig): S3Client {
	return new S3Client({
		region: config.region || 'us-east-1',
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		...(config.endpoint ? { endpoint: config.endpoint } : {}),
		// R2 requires path-style addressing; virtual-hosted-style bucket subdomains don't resolve.
		forcePathStyle: config.forcePathStyle || (config.endpoint ? isR2Endpoint(config.endpoint) : false),
		// R2 doesn't support the CRC32 checksums the SDK now sends by default on every request.
		requestChecksumCalculation: 'WHEN_REQUIRED',
		responseChecksumValidation: 'WHEN_REQUIRED',
	});
}

export function storageClient(id: string): { client: S3Client; bucket: string } {
	const config = getStorage(id);
	if (!config) throw new Error('Storage is not configured.');
	if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
		throw new Error('Storage is not configured.');
	}
	return { client: createStorageClient(config), bucket: config.bucket };
}
