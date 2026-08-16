import fs from 'node:fs';
import path from 'node:path';
import { StorageError } from './error';

export function storagePath(root: string, requestedPath: string, createRoot = false): string {
	if (
		!requestedPath.trim() ||
		requestedPath.includes('\0') ||
		requestedPath.includes('\\') ||
		path.win32.isAbsolute(requestedPath)
	) {
		throw new StorageError(400, 'File path must be a non-empty relative path.');
	}

	const resolvedRoot = path.resolve(root);
	if (createRoot) fs.mkdirSync(resolvedRoot, { recursive: true });
	if (fs.existsSync(resolvedRoot) && fs.lstatSync(resolvedRoot).isSymbolicLink()) {
		throw new StorageError(400, 'The files directory cannot be a symbolic link.');
	}

	const resolvedPath = path.resolve(resolvedRoot, requestedPath);
	const relativePath = path.relative(resolvedRoot, resolvedPath);
	if (
		!relativePath ||
		relativePath === '..' ||
		relativePath.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativePath)
	) {
		throw new StorageError(400, 'File path must stay inside the files directory.');
	}

	let currentPath = resolvedRoot;
	for (const segment of relativePath.split(path.sep)) {
		currentPath = path.join(currentPath, segment);
		if (fs.existsSync(currentPath) && fs.lstatSync(currentPath).isSymbolicLink()) {
			throw new StorageError(400, 'Symbolic links are not allowed in file paths.');
		}
	}

	return resolvedPath;
}
