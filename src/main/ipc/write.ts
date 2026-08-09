import fs from 'node:fs/promises';

import { workspaceFileType } from '../../shared/workspace';
import { resolveWorkspaceFile } from './workspace';

const EDITABLE_KINDS = new Set(['markdown', 'mermaid', 'excalidraw']);

export async function writeWorkspaceFile(
	root: string,
	filePath: string,
	content: string
): Promise<void> {
	const resolvedPath = await resolveWorkspaceFile(root, filePath);
	const stats = await fs.stat(resolvedPath);
	if (!stats.isFile()) throw new Error('Workspace path is not a file.');
	if (!EDITABLE_KINDS.has(workspaceFileType(resolvedPath).kind)) {
		throw new Error('Only Markdown, Mermaid, and Excalidraw workspace files can be edited.');
	}
	await fs.writeFile(resolvedPath, content, 'utf8');
}
