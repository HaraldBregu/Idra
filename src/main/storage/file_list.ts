import fs from 'node:fs';
import path from 'node:path';
import { StorageError } from './error';
import type { StoredFile } from './types';

export function listFiles(dataDirectory: string): StoredFile[] {
	const root = path.join(path.resolve(dataDirectory), 'files');
	if (!fs.existsSync(root)) return [];
	if (fs.lstatSync(root).isSymbolicLink()) {
		throw new StorageError(400, 'The files directory cannot be a symbolic link.');
	}

	const files: StoredFile[] = [];
	const directories = [root];
	while (directories.length > 0) {
		const directory = directories.pop();
		if (!directory) break;
		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			const entryPath = path.join(directory, entry.name);
			if (entry.isDirectory()) directories.push(entryPath);
			else if (entry.isFile()) {
				files.push({
					path: path.relative(root, entryPath).split(path.sep).join('/'),
					size: fs.statSync(entryPath).size,
				});
			}
		}
	}

	return files.sort((left, right) => left.path.localeCompare(right.path));
}
