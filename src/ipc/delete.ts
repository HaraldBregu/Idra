import fs from 'node:fs/promises';

import { resolveWorkspaceFile } from './workspace';

export async function deleteWorkspaceFile(root: string, filePath: string): Promise<void> {
	const resolvedPath = await resolveWorkspaceFile(root, filePath);
	const stats = await fs.stat(resolvedPath);
	if (!stats.isFile()) throw new Error('Workspace path is not a file.');
	await fs.unlink(resolvedPath);
}
