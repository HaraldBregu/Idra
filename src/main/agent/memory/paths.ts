import { promises as fs } from 'node:fs';
import path from 'node:path';
import { MEMORY_DIRNAME, MEMORY_FILENAME } from './constants';

export async function listMemoryFiles(
	workspaceDir: string,
	extraPaths: string[]
): Promise<string[]> {
	const files: string[] = [];
	await pushIfAllowed(files, path.join(workspaceDir, MEMORY_FILENAME), workspaceDir, extraPaths);
	await walkMemoryDir(files, path.join(workspaceDir, MEMORY_DIRNAME), workspaceDir, extraPaths);
	for (const extraPath of extraPaths) {
		const absolute = path.isAbsolute(extraPath)
			? path.resolve(extraPath)
			: path.resolve(workspaceDir, extraPath);
		await walkExtraPath(files, absolute, workspaceDir, extraPaths);
	}
	return [...new Set(files)];
}

async function walkMemoryDir(
	files: string[],
	dir: string,
	workspaceDir: string,
	extraPaths: string[]
): Promise<void> {
	let entries: string[];
	try {
		entries = await fs.readdir(dir);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw err;
	}
	for (const entry of entries) {
		const absolute = path.join(dir, entry);
		const stat = await fs.lstat(absolute);
		if (stat.isDirectory()) {
			await walkMemoryDir(files, absolute, workspaceDir, extraPaths);
		} else {
			await pushIfAllowed(files, absolute, workspaceDir, extraPaths);
		}
	}
}

async function walkExtraPath(
	files: string[],
	absolute: string,
	workspaceDir: string,
	extraPaths: string[]
): Promise<void> {
	let stat;
	try {
		stat = await fs.lstat(absolute);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
		throw err;
	}
	if (stat.isDirectory()) {
		const entries = await fs.readdir(absolute);
		for (const entry of entries) {
			await walkExtraPath(files, path.join(absolute, entry), workspaceDir, extraPaths);
		}
		return;
	}
	await pushIfAllowed(files, absolute, workspaceDir, extraPaths);
}

async function pushIfAllowed(
	files: string[],
	absolute: string,
	workspaceDir: string,
	extraPaths: string[]
): Promise<void> {
	try {
		const allowed = await resolveAllowedMemoryFile(workspaceDir, absolute, extraPaths);
		files.push(allowed);
	} catch {
		return;
	}
}

export async function resolveAllowedMemoryFile(
	workspaceDir: string,
	requestedPath: string,
	extraPaths: string[]
): Promise<string> {
	const workspace = path.resolve(workspaceDir);
	const absolute = path.isAbsolute(requestedPath)
		? path.resolve(requestedPath)
		: path.resolve(workspace, requestedPath);
	const stat = await fs.stat(absolute);
	if (!stat.isFile()) throw new Error('Memory path is not a file.');
	if (path.extname(absolute).toLowerCase() !== '.md')
		throw new Error('Memory path must be Markdown.');

	const workspaceReal = await fs.realpath(workspace).catch(() => workspace);
	const real = await fs.realpath(absolute);
	const rootMemory = absolute === path.join(workspace, MEMORY_FILENAME);
	const memoryRelative = path.relative(path.join(workspace, MEMORY_DIRNAME), absolute);
	const underMemoryDir =
		memoryRelative !== '' && !memoryRelative.startsWith('..') && !path.isAbsolute(memoryRelative);
	const underWorkspaceReal = isInside(workspaceReal, real);
	const extraAllowed = await isAllowedExtraPath(real, workspace, extraPaths);

	if ((rootMemory || underMemoryDir) && underWorkspaceReal) return real;
	if (extraAllowed) return real;
	throw new Error('Memory path is outside allowed memory roots.');
}

async function isAllowedExtraPath(
	real: string,
	workspace: string,
	extraPaths: string[]
): Promise<boolean> {
	for (const extraPath of extraPaths) {
		const absolute = path.isAbsolute(extraPath)
			? path.resolve(extraPath)
			: path.resolve(workspace, extraPath);
		const extraReal = await fs.realpath(absolute).catch(() => absolute);
		if (real === extraReal || isInside(extraReal, real)) return true;
	}
	return false;
}

function isInside(root: string, target: string): boolean {
	const relative = path.relative(path.resolve(root), path.resolve(target));
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
