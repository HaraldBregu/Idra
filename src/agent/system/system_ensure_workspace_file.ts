import { copyFileSync, existsSync } from 'node:fs';
import type { WorkspaceFile } from './system_types';
import { resolveTemplatePath } from './system_resolve_template_path';
import { resolveWorkspacePath } from './system_resolve_workspace_path';

export function ensureWorkspaceFile(workspacePath: string, filePath: WorkspaceFile): void {
	const workspaceFilePath = resolveWorkspacePath(workspacePath, filePath);
	if (existsSync(workspaceFilePath)) return;
	copyFileSync(resolveTemplatePath(filePath), workspaceFilePath);
}
