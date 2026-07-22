import { HeadBucketCommand } from '@aws-sdk/client-s3';
import type { CloudConfig, CloudTestResult } from '../../shared/cloud_types';
import { createCloudClient } from './cloud_client';

export async function testConnection(config: CloudConfig): Promise<CloudTestResult> {
	if (!config.bucket) return { ok: false, error: 'Bucket name is required.' };
	try {
		const client = createCloudClient(config);
		await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Connection failed.' };
	}
}
