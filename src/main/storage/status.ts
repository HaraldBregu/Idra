import fs from 'node:fs';
import path from 'node:path';
import { listFiles } from './file_list';

export function storageStatus(dataDirectory: string): {
	dataDirectory: string;
	settings: { path: string; exists: boolean };
	files: { directory: string; count: number };
} {
	const resolvedDirectory = path.resolve(dataDirectory);
	return {
		dataDirectory: resolvedDirectory,
		settings: {
			path: 'settings.json',
			exists: fs.existsSync(path.join(resolvedDirectory, 'settings.json')),
		},
		files: {
			directory: 'files',
			count: listFiles(resolvedDirectory).length,
		},
	};
}
