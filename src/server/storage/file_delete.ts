import fs from 'node:fs';
import path from 'node:path';
import { StorageError } from './error';
import { storagePath } from './path';

export function deleteFile(dataDirectory: string, requestedPath: string): boolean {
	const root = path.join(path.resolve(dataDirectory), 'files');
	const filePath = storagePath(root, requestedPath);
	if (!fs.existsSync(filePath)) return false;
	if (!fs.statSync(filePath).isFile()) throw new StorageError(400, 'Path must identify a file.');
	fs.rmSync(filePath);
	return true;
}
