import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { cloudClient } from './cloud_client';

export async function deleteObject(key: string): Promise<void> {
	const { client, bucket } = cloudClient();
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
