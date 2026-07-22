import { PutObjectCommand } from '@aws-sdk/client-s3';
import { cloudClient } from './cloud_client';

export async function putObject(
	key: string,
	data: Uint8Array,
	contentType?: string
): Promise<void> {
	const { client, bucket } = cloudClient();
	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: data,
			...(contentType ? { ContentType: contentType } : {}),
		})
	);
}
