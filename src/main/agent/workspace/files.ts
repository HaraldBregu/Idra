import fs from 'node:fs/promises';
import path from 'node:path';
import {
	BUNDLED_TEMPLATES,
	FALLBACK_TEMPLATE_DIRS,
	MAX_WORKSPACE_CONTEXT_FILE_BYTES,
	workspaceFileNames,
	stripFrontMatter,
} from './common';
import type { WorkspaceContextFile, WorkspaceFileName } from './types';

export {
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_MEMORY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_TOOLS_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS,
	DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS,
	MAX_WORKSPACE_CONTEXT_FILE_BYTES,
	SEEDED_WORKSPACE_FILE_NAMES,
	WORKSPACE_CONTEXT_FILE_NAMES,
} from './common';
export type { WorkspaceContextFile, WorkspaceFileName, WorkspaceFileSummary } from './types';

export function isWorkspaceFileName(name: string): name is WorkspaceFileName {
	return workspaceFileNames.has(name);
}

export function assertWorkspaceFileName(name: string): asserts name is WorkspaceFileName {
	if (!isWorkspaceFileName(name)) {
		throw new Error(`Unsupported workspace file: ${name}`);
	}
}

export async function loadWorkspaceTemplate(name: WorkspaceFileName): Promise<string> {
	const bundled = BUNDLED_TEMPLATES[name];
	if (bundled !== undefined) return bundled;

	for (const dir of FALLBACK_TEMPLATE_DIRS) {
		try {
			return stripFrontMatter(await fs.readFile(path.join(dir, name), 'utf8'));
		} catch {
			continue;
		}
	}
	throw new Error(`Missing workspace template: ${name}`);
}

export async function writeFileIfMissing(filePath: string, content: string): Promise<boolean> {
	try {
		await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
		throw error;
	}
}

export function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export async function safeReadWorkspaceFile(
	workspaceRoot: string,
	name: WorkspaceFileName
): Promise<WorkspaceContextFile> {
	const filePath = path.join(workspaceRoot, name);
	try {
		const stat = await fs.lstat(filePath);
		if (stat.isSymbolicLink()) {
			return unsafeFile(name, filePath, 'symbolic links are not allowed');
		}
		if (!stat.isFile()) {
			return unsafeFile(name, filePath, 'not a regular file');
		}
		if (stat.nlink > 1) {
			return unsafeFile(name, filePath, 'hard-linked files are not allowed');
		}
		if (stat.size > MAX_WORKSPACE_CONTEXT_FILE_BYTES) {
			return unsafeFile(name, filePath, `file exceeds ${MAX_WORKSPACE_CONTEXT_FILE_BYTES} bytes`);
		}

		const [rootRealPath, fileRealPath] = await Promise.all([
			fs.realpath(workspaceRoot),
			fs.realpath(filePath),
		]);
		if (!isPathInside(rootRealPath, fileRealPath)) {
			return unsafeFile(name, filePath, 'file resolves outside the workspace');
		}

		return {
			name,
			path: filePath,
			content: await fs.readFile(fileRealPath, 'utf8'),
			missing: false,
		};
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { name, path: filePath, missing: true, error: 'missing' };
		}
		return {
			name,
			path: filePath,
			missing: true,
			error: 'io',
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}

function unsafeFile(name: WorkspaceFileName, filePath: string, detail: string): WorkspaceContextFile {
	return { name, path: filePath, missing: true, error: 'unsafe', detail };
}
