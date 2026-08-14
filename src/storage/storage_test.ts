import { HeadBucketCommand } from '@aws-sdk/client-s3';
import type { StorageConfig, StorageTestResult } from '../shared/storage_types';
import { createStorageClient } from './storage_client';
import { describeStorageError } from './storage_error';

export async function testConnection(config: StorageConfig): Promise<StorageTestResult> {
	if (!config.bucket) return { ok: false, error: 'Bucket name is required.' };
	try {
		const client = createStorageClient(config);
		await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
		return { ok: true };
	} catch (error) {
		return { ok: false, error: describeStorageError(error) };
	}
}
