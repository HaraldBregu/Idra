import fs from 'node:fs';
import path from 'node:path';
import { realPath } from '../../shared/real_path';

export function workspaceFilePath(rootPath: string, requestedPath: string): string {
	if (!rootPath || rootPath.includes('\0') || !path.isAbsolute(rootPath)) {
		throw new Error('Workspace root must be an absolute path.');
	}
	if (
		!requestedPath ||
		requestedPath.includes('\0') ||
		requestedPath.includes('\\') ||
		path.isAbsolute(requestedPath) ||
		path.win32.isAbsolute(requestedPath) ||
		requestedPath.split('/').includes('..')
	) {
		throw new Error('File path must be relative and stay inside the workspace root.');
	}

	const root = path.resolve(rootPath);
	if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink()) {
		throw new Error('Workspace root must be an existing directory, not a symbolic link.');
	}
	const resolvedRoot = fs.realpathSync(root);
	if (!fs.statSync(resolvedRoot).isDirectory()) {
		throw new Error('Workspace root must be a directory.');
	}

	const resolvedPath = realPath(path.resolve(resolvedRoot, requestedPath));
	const relativePath = path.relative(resolvedRoot, resolvedPath);
	if (
		!relativePath ||
		relativePath === '..' ||
		relativePath.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativePath)
	) {
		throw new Error('File path must stay inside the workspace root.');
	}
	return resolvedPath;
}
