import fs from 'node:fs/promises';
import path from 'node:path';
import type { WorkspaceFile } from './types';

export async function readTextFile(workspacePath: string, filePath: WorkspaceFile): Promise<string> {
	try {
		return await fs.readFile(resolveWorkspacePath(workspacePath, filePath), 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
		throw error;
	}
}

export function resolveWorkspacePath(workspacePath: string, filePath: WorkspaceFile): string {
	if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
		throw new Error(`Workspace file path must be relative: ${filePath}`);
	}
	const resolvedPath = path.resolve(workspacePath, filePath);
	const relativePath = path.relative(workspacePath, resolvedPath);
	if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
		throw new Error(`Workspace file path resolves outside workspace: ${filePath}`);
	}
	return resolvedPath;
}
