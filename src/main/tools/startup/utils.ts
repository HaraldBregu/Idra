import fs from 'node:fs/promises';
import path from 'node:path';
import { isPathInside, type WorkspaceFileName } from './workspace';

export async function fileContentDiffersFromTemplate(
	filePath: string,
	template: string
): Promise<boolean> {
	try {
		return (await fs.readFile(filePath, 'utf8')) !== template;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		return false;
	}
}

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

export async function assertSafeWritableStartupFile(
	root: string,
	name: WorkspaceFileName,
	filePath: string
): Promise<void> {
	const rootPath = path.resolve(root);
	if (!isPathInside(rootPath, filePath)) {
		throw new Error(`Startup file resolves outside root: ${name}`);
	}
	try {
		const stat = await fs.lstat(filePath);
		if (stat.isSymbolicLink()) throw new Error(`Refusing to write symlink: ${name}`);
		if (!stat.isFile()) throw new Error(`Refusing to write non-file: ${name}`);
		if (stat.nlink > 1) throw new Error(`Refusing to write hard-linked file: ${name}`);
		const [rootRealPath, fileRealPath] = await Promise.all([
			fs.realpath(root),
			fs.realpath(filePath),
		]);
		if (!isPathInside(rootRealPath, fileRealPath)) {
			throw new Error(`Startup file resolves outside root: ${name}`);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
}
