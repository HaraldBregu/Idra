import { WORKSPACE_FILES } from './system-types';
import { ensureWorkspaceFile } from './system-ensure-workspace-file';

export function ensureWorkspaceFiles(workspacePath: string): void {
	for (const filePath of WORKSPACE_FILES) {
		ensureWorkspaceFile(workspacePath, filePath);
	}
}
