import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { CloudObjectInfo } from '../../shared/cloud_types';
import { cloudClient } from './cloud_client';

// ponytail: returns first page only (up to 1000 keys); add ContinuationToken paging if buckets grow larger
export async function listObjects(prefix?: string): Promise<CloudObjectInfo[]> {
	const { client, bucket } = cloudClient();
	const response = await client.send(
		new ListObjectsV2Command({ Bucket: bucket, ...(prefix ? { Prefix: prefix } : {}) })
	);
	return (response.Contents ?? []).map((item) => ({
		key: item.Key ?? '',
		size: item.Size ?? 0,
		lastModified: item.LastModified?.toISOString(),
	}));
}
