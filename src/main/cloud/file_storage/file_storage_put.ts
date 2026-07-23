import { PutObjectCommand } from '@aws-sdk/client-s3';
import { fileStorageClient } from './file_storage_client';

export async function putObject(
	id: string,
	key: string,
	data: Uint8Array,
	contentType?: string
): Promise<void> {
	const { client, bucket } = fileStorageClient(id);
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: data,
			...(contentType ? { ContentType: contentType } : {}),
		})
	);
}
