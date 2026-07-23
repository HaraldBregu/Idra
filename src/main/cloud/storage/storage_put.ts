import { PutObjectCommand } from '@aws-sdk/client-s3';
import { storageClient } from './storage_client';

export async function putObject(
	id: string,
	key: string,
	data: Uint8Array,
	contentType?: string
): Promise<void> {
	const { client, bucket } = storageClient(id);
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: data,
			...(contentType ? { ContentType: contentType } : {}),
		})
	);
}
