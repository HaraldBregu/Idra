import { GetObjectCommand } from '@aws-sdk/client-s3';
import { fileStorageClient } from './file_storage_client';

export async function getObject(id: string, key: string): Promise<Uint8Array> {
	const { client, bucket } = fileStorageClient(id);
	const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
	if (!response.Body) throw new Error(`Object not found: ${key}`);
	return response.Body.transformToByteArray();
}
