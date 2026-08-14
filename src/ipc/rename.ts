import fs from 'node:fs/promises';
import path from 'node:path';

import { resolveWorkspaceFile } from './workspace';
import { workspaceEntryName } from './workspace_name';

export async function renameWorkspaceEntry(
	root: string,
	sourcePath: string,
	name: string
): Promise<string> {
	const resolvedRoot = await fs.realpath(root);
	const resolvedSource = await resolveWorkspaceFile(root, sourcePath);
	if (path.resolve(resolvedRoot, sourcePath) !== resolvedSource) {
		throw new Error('Workspace symlinks cannot be renamed.');
	}
	if (resolvedSource === resolvedRoot) throw new Error('The workspace root cannot be renamed.');

	const sourceStats = await fs.stat(resolvedSource);
	if (!sourceStats.isFile() && !sourceStats.isDirectory()) {
		throw new Error('Workspace path is not a file or folder.');
	}

	const normalizedName = workspaceEntryName(name);
	const targetPath = path.join(path.dirname(resolvedSource), normalizedName);
	if (targetPath === resolvedSource) {
		return path.relative(resolvedRoot, resolvedSource).split(path.sep).join('/');
	}

	try {
		await fs.lstat(targetPath);
		if ((await fs.realpath(targetPath)) !== resolvedSource) {
			throw new Error(`An item named "${normalizedName}" already exists.`);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}

	await fs.rename(resolvedSource, targetPath);
	return path.relative(resolvedRoot, targetPath).split(path.sep).join('/');
}
