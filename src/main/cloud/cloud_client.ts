import { S3Client } from '@aws-sdk/client-s3';
import type { CloudConfig } from '../../shared/cloud_types';
import { getCloudConfig } from './cloud_store';

export function createCloudClient(config: CloudConfig): S3Client {
	return new S3Client({
		region: config.region || 'us-east-1',
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
		...(config.endpoint ? { endpoint: config.endpoint } : {}),
		forcePathStyle: config.forcePathStyle,
	});
}

export function cloudClient(): { client: S3Client; bucket: string } {
	const config = getCloudConfig();
	if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
		throw new Error('Cloud storage is not configured.');
	}
	return { client: createCloudClient(config), bucket: config.bucket };
}
