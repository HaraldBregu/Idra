import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CloudPushResult } from '../../shared/cloud_types';
import { describeCloudError } from './cloud_error';
import { putObject } from './cloud_put';
import { getCloudConfig } from './cloud_store';

export async function pushFiles(): Promise<CloudPushResult> {
	const { filePaths } = getCloudConfig();
	const uploaded: string[] = [];
	const failed: CloudPushResult['failed'] = [];

	for (const filePath of filePaths) {
		try {
			const data = await fs.readFile(filePath);
			await putObject(path.basename(filePath), data);
			uploaded.push(filePath);
		} catch (error) {
			failed.push({ path: filePath, error: describeCloudError(error) });
		}
	}

	return { uploaded, failed };
}
