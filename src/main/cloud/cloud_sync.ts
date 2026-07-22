import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CloudSyncResult } from '../../shared/cloud_types';
import { listObjects } from './cloud_list';
import { putObject } from './cloud_put';

// ponytail: upload-only mirror with size-only diff; add download direction / checksums if content drift matters
export async function syncDirectory(localDir: string, prefix = ''): Promise<CloudSyncResult> {
	const remote = new Map((await listObjects(prefix)).map((item) => [item.key, item.size]));
	const uploaded: string[] = [];
	const skipped: string[] = [];
	for (const file of await walk(localDir)) {
		const key = prefix + path.relative(localDir, file).split(path.sep).join('/');
		const data = await fs.readFile(file);
		if (remote.get(key) === data.byteLength) {
			skipped.push(key);
			continue;
		}
		await putObject(key, data);
		uploaded.push(key);
	}
	return { uploaded, skipped };
}

async function walk(dir: string): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(dir, entry.name);
			return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
		})
	);
	return nested.flat();
}
