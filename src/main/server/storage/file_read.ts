import fs from 'node:fs';
import path from 'node:path';
import { StorageError } from './error';
import { storagePath } from './path';
import type { StoredFileContent } from './types';

export function readFile(dataDirectory: string, requestedPath: string): StoredFileContent {
	const root = path.join(path.resolve(dataDirectory), 'files');
	const filePath = storagePath(root, requestedPath);
	if (!fs.existsSync(filePath)) throw new StorageError(404, 'File not found.');
	const stats = fs.statSync(filePath);
	if (!stats.isFile()) throw new StorageError(400, 'Path must identify a file.');
	return { path: requestedPath, size: stats.size, content: fs.readFileSync(filePath, 'utf8') };
}
