import { HeadBucketCommand } from '@aws-sdk/client-s3';
import type { FileStorageConfig, FileStorageTestResult } from '../../../shared/file_storage_types';
import { createFileStorageClient } from './file_storage_client';
import { describeFileStorageError } from './file_storage_error';

export async function testConnection(config: FileStorageConfig): Promise<FileStorageTestResult> {
	if (!config.bucket) return { ok: false, error: 'Bucket name is required.' };
	try {
		const client = createFileStorageClient(config);
		await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
		return { ok: true };
	} catch (error) {
		return { ok: false, error: describeFileStorageError(error) };
	}
}
