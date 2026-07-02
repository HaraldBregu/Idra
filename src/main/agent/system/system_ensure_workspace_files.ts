import { WORKSPACE_FILES } from './system_types';
import { ensureWorkspaceFile } from './system_ensure_workspace_file';

export function ensureWorkspaceFiles(workspacePath: string): void {
	for (const filePath of WORKSPACE_FILES) {
		ensureWorkspaceFile(workspacePath, filePath);
	}
}
