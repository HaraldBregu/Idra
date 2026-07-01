import fs from 'node:fs/promises';
import type { WorkspaceFile } from './system-types';
import { resolveWorkspacePath } from './system-resolve-workspace-path';

export async function readTextFile(workspacePath: string, filePath: WorkspaceFile): Promise<string> {
	try {
		return await fs.readFile(resolveWorkspacePath(workspacePath, filePath), 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
		throw error;
	}
}
