import path from 'node:path';
import type { RuntimeTool } from '../types';
import type { Workspace } from './workspace';

export abstract class Tool {
	protected constructor(protected readonly workspace: Workspace) {}

	abstract toRuntimeTool(): RuntimeTool;

	protected resolveWorkspacePath(filePath: string): string {
		if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
			throw new Error(`Tool file path must be relative: ${filePath}`);
		}
		const workspacePath = this.workspace.getPath();
		const resolvedPath = path.resolve(workspacePath, filePath);
		const relativePath = path.relative(workspacePath, resolvedPath);
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Tool file path resolves outside workspace: ${filePath}`);
		}
		return resolvedPath;
	}
}
