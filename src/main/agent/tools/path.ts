import path from 'node:path';
import type { Workspace } from '../core/workspace';

export function resolveWorkspacePath(workspace: Workspace, filePath: string): string {
	if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
		throw new Error(`Tool file path must be relative: ${filePath}`);
	}
	const workspacePath = workspace.getPath();
	const resolvedPath = path.resolve(workspacePath, filePath);
	const relativePath = path.relative(workspacePath, resolvedPath);
	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		throw new Error(`Tool file path resolves outside workspace: ${filePath}`);
	}
	return resolvedPath;
}
