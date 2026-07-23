import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { FileStorageObjectInfo } from '../../../shared/file_storage_types';
import { fileStorageClient } from './file_storage_client';

// ponytail: returns first page only (up to 1000 keys); add ContinuationToken paging if buckets grow larger
export async function listObjects(id: string, prefix?: string): Promise<FileStorageObjectInfo[]> {
	const { client, bucket } = fileStorageClient(id);
	const response = await client.send(
		new ListObjectsV2Command({ Bucket: bucket, ...(prefix ? { Prefix: prefix } : {}) })
	);
	return (response.Contents ?? []).map((item) => ({
		key: item.Key ?? '',
		size: item.Size ?? 0,
		lastModified: item.LastModified?.toISOString(),
	}));
}
