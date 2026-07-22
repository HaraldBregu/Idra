import { GetObjectCommand } from '@aws-sdk/client-s3';
import { cloudClient } from './cloud_client';

export async function getObject(key: string): Promise<Uint8Array> {
	const { client, bucket } = cloudClient();
	const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
	if (!response.Body) throw new Error(`Object not found: ${key}`);
	return response.Body.transformToByteArray();
}
