import { copyFileSync, existsSync } from 'node:fs';
import type { WorkspaceFile } from './types';
import { resolveTemplatePath } from './common';
import { resolveWorkspacePath } from './common';

export function ensureWorkspaceFile(workspacePath: string, filePath: WorkspaceFile): void {
	const workspaceFilePath = resolveWorkspacePath(workspacePath, filePath);
	if (existsSync(workspaceFilePath)) return;
	copyFileSync(resolveTemplatePath(filePath), workspaceFilePath);
}
