import fs from 'node:fs/promises';
import path from 'node:path';

export async function resolveWorkspaceFile(root: string, filePath: string): Promise<string> {
	const resolvedRoot = await fs.realpath(root);
	const candidate = path.resolve(resolvedRoot, filePath);
	const lexicalRelativePath = path.relative(resolvedRoot, candidate);
	if (
		lexicalRelativePath === '..' ||
		lexicalRelativePath.startsWith(`..${path.sep}`) ||
		path.isAbsolute(lexicalRelativePath)
	) {
		throw new Error('Workspace file path resolves outside workspace.');
	}

	const resolvedFile = await fs.realpath(candidate);
	const relativePath = path.relative(resolvedRoot, resolvedFile);
	if (
		relativePath === '..' ||
		relativePath.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativePath)
	) {
		throw new Error('Workspace file path resolves outside workspace.');
	}
	return resolvedFile;
}
