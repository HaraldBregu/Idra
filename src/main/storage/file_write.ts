import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite } from '../shared/atomic_write';
import { storagePath } from './path';
import type { StoredFile } from './types';

export async function writeFile(
	dataDirectory: string,
	requestedPath: string,
	content: string
): Promise<{ created: boolean; file: StoredFile }> {
	const root = path.join(path.resolve(dataDirectory), 'files');
	const filePath = storagePath(root, requestedPath, true);
	const created = !fs.existsSync(filePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	await atomicWrite(filePath, content);
	return { created, file: { path: requestedPath, size: Buffer.byteLength(content) } };
}
