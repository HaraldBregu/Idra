import { copyFileSync, existsSync } from 'node:fs';
import type { WorkspaceFile } from './system-types';
import { resolveTemplatePath } from './system-resolve-template-path';
import { resolveWorkspacePath } from './system-resolve-workspace-path';

export function ensureWorkspaceFile(workspacePath: string, filePath: WorkspaceFile): void {
	const workspaceFilePath = resolveWorkspacePath(workspacePath, filePath);
	if (existsSync(workspaceFilePath)) return;
	copyFileSync(resolveTemplatePath(filePath), workspaceFilePath);
}
