import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Config } from '../types';
import { ensureWorkspaceFiles } from './system-ensure-workspace-files';

export function workspacePath(config: Config): string {
	const resolvedPath = path.resolve(config.location, 'workspace');
	if (!existsSync(resolvedPath)) {
		mkdirSync(resolvedPath, { recursive: true });
	}
	ensureWorkspaceFiles(resolvedPath);
	return resolvedPath;
}
