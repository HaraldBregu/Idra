import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fileStorageClient } from './file_storage_client';

export async function deleteObject(id: string, key: string): Promise<void> {
	const { client, bucket } = fileStorageClient(id);
	await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
