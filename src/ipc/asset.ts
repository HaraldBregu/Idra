import fs from 'node:fs/promises';

import { workspaceFileType, type WorkspaceAsset } from '../shared/workspace';
import { resolveWorkspaceFile } from './workspace';

export async function readWorkspaceAsset(root: string, filePath: string): Promise<WorkspaceAsset> {
	const resolvedPath = await resolveWorkspaceFile(root, filePath);
	const stats = await fs.stat(resolvedPath);
	if (!stats.isFile()) throw new Error('Workspace path is not a file.');
	const fileType = workspaceFileType(resolvedPath);
	if (!fileType.mimeType || !['image', 'audio', 'video', 'pdf'].includes(fileType.kind)) {
		throw new Error('Workspace file is not a supported asset.');
	}
	return {
		mimeType: fileType.mimeType,
		data: new Uint8Array(await fs.readFile(resolvedPath)),
	};
}
