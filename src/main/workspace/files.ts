import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_AGENTS_FILENAME = 'AGENTS.md';
export const DEFAULT_SOUL_FILENAME = 'SOUL.md';
export const DEFAULT_IDENTITY_FILENAME = 'IDENTITY.md';
export const DEFAULT_USER_FILENAME = 'USER.md';
export const DEFAULT_HEARTBEAT_FILENAME = 'HEARTBEAT.md';
export const DEFAULT_BOOTSTRAP_FILENAME = 'BOOTSTRAP.md';
export const DEFAULT_MEMORY_FILENAME = 'MEMORY.md';

export const WORKSPACE_CONTEXT_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
] as const;

export const SEEDED_WORKSPACE_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
] as const;

export const OPTIONAL_WORKSPACE_TEMPLATE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
] as const;

export const DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS = 12_000;
export const DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS = 60_000;
export const MAX_WORKSPACE_CONTEXT_FILE_BYTES = 2 * 1024 * 1024;

export type WorkspaceFileName = (typeof WORKSPACE_CONTEXT_FILE_NAMES)[number];
export type OptionalWorkspaceTemplateFileName =
	(typeof OPTIONAL_WORKSPACE_TEMPLATE_FILE_NAMES)[number];

export type WorkspaceContextFile = {
	name: WorkspaceFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
};

export type WorkspaceFileSummary = {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
};

const BUNDLED_TEMPLATES: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob('../templates/*.md', {
			query: '?raw',
			eager: true,
			import: 'default',
		}) as Record<string, string>
	).map(([templatePath, content]) => [path.basename(templatePath), stripFrontMatter(content)])
);

const workspaceFileNames = new Set<string>(WORKSPACE_CONTEXT_FILE_NAMES);

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

	const sourcePath = path.resolve(process.cwd(), 'src', 'main', 'templates', name);
	try {
		return stripFrontMatter(await fs.readFile(sourcePath, 'utf8'));
	} catch {
		throw new Error(`Missing workspace template: ${name}`);
	}
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

function stripFrontMatter(content: string): string {
	if (!content.startsWith('---')) return content;
	const endIndex = content.indexOf('\n---', 3);
	if (endIndex === -1) return content;
	return content.slice(endIndex + '\n---'.length).replace(/^\s+/, '');
}

function unsafeFile(name: WorkspaceFileName, filePath: string, detail: string): WorkspaceContextFile {
	return { name, path: filePath, missing: true, error: 'unsafe', detail };
}
