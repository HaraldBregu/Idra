import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { storageClient } from './storage_client';

export async function deleteObject(id: string, key: string): Promise<void> {
	const { client, bucket } = storageClient(id);
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
