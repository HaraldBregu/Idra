import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { LoggerService } from '../logger';
import { resolveDefaultUserDataPath } from '../user-data';
import type { ReadFileOptions, WorkspaceServiceOptions, WriteFileOptions } from './types';
import {
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
	OPTIONAL_WORKSPACE_TEMPLATE_FILE_NAMES,
	SEEDED_WORKSPACE_FILE_NAMES,
	WORKSPACE_CONTEXT_FILE_NAMES,
	assertWorkspaceFileName,
	isPathInside,
	loadWorkspaceTemplate,
	safeReadWorkspaceFile,
	writeFileIfMissing,
	type WorkspaceContextFile,
	type WorkspaceFileName,
	type WorkspaceFileSummary,
} from './files';

const execFileAsync = promisify(execFile);

export type EnsureWorkspaceOptions = {
	initializeGit?: boolean;
};

export type BootstrapMode = 'none' | 'limited' | 'full';

const WORKSPACE_STATE_DIRNAME = '.friday';
const WORKSPACE_STATE_FILENAME = 'workspace-state.json';
const WORKSPACE_STATE_VERSION = 1;
const WORKSPACE_PROFILE_FILENAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const;

type WorkspaceSetupState = {
	version: typeof WORKSPACE_STATE_VERSION;
	bootstrapSeededAt?: string;
	setupCompletedAt?: string;
};

const CONTEXT_FILE_PROMPT_ORDER = new Map<WorkspaceFileName, number>([
	[DEFAULT_AGENTS_FILENAME, 10],
	[DEFAULT_SOUL_FILENAME, 20],
	[DEFAULT_IDENTITY_FILENAME, 30],
	[DEFAULT_USER_FILENAME, 40],
	[DEFAULT_TOOLS_FILENAME, 50],
	[DEFAULT_BOOTSTRAP_FILENAME, 60],
	[DEFAULT_MEMORY_FILENAME, 70],
	[DEFAULT_HEARTBEAT_FILENAME, 80],
]);

export class WorkspaceService {
	private readonly rootPath: string;
	private readonly contextHooks: NonNullable<WorkspaceServiceOptions['contextHooks']>;

	constructor(
		private readonly logger: LoggerService,
		options: WorkspaceServiceOptions = {}
	) {
		this.rootPath =
			options.rootPath ??
			options.userDataDirectory?.resolve(options.workspaceName ?? 'workspace') ??
			resolveDefaultUserDataPath(options.workspaceName ?? 'workspace');
		this.contextHooks = options.contextHooks ?? [];
	}

	getRootPath(): string {
		return this.rootPath;
	}

	resolvePath(...segments: string[]): string {
		const targetPath = path.resolve(this.rootPath, ...segments);
		const relativePath = path.relative(this.rootPath, targetPath);

		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Workspace path is outside root: ${segments.join(path.sep)}`);
		}

		return targetPath;
	}

	async ensureReady(options: EnsureWorkspaceOptions = {}): Promise<void> {
		const brandNewWorkspace = await this.isBrandNewWorkspace();
		await fs.mkdir(this.rootPath, { recursive: true });
		if (options.initializeGit ?? true) {
			await this.ensureGitRepo(brandNewWorkspace);
		}
		this.logger.debug('WorkspaceService', 'Workspace ready', { rootPath: this.rootPath });
	}

	async ensureDirectory(...segments: string[]): Promise<string> {
		const directoryPath = this.resolvePath(...segments);
		await fs.mkdir(directoryPath, { recursive: true });
		this.logger.debug('WorkspaceService', 'Directory ready', { path: directoryPath });
		return directoryPath;
	}

	async exists(...segments: string[]): Promise<boolean> {
		try {
			await fs.access(this.resolvePath(...segments));
			return true;
		} catch {
			return false;
		}
	}

	async readText(relativePath: string, options: ReadFileOptions = {}): Promise<string> {
		await this.ensureReady();
		return fs.readFile(this.resolvePath(relativePath), options.encoding ?? 'utf8');
	}

	async writeText(
		relativePath: string,
		content: string,
		options: WriteFileOptions = {}
	): Promise<void> {
		await this.ensureReady();
		const filePath = this.resolvePath(relativePath);
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, options.encoding ?? 'utf8');
		this.logger.debug('WorkspaceService', 'File written', { path: filePath });
	}

	async readJson<T = unknown>(relativePath: string): Promise<T> {
		const content = await this.readText(relativePath);
		return JSON.parse(content) as T;
	}

	async writeJson(relativePath: string, value: unknown): Promise<void> {
		await this.writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
	}

	async loadContextFiles(): Promise<WorkspaceContextFile[]> {
		await this.ensureReady();
		let files = await Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map((name) => safeReadWorkspaceFile(this.rootPath, name))
		);
		const state = await this.readSetupState();
		if (state.setupCompletedAt) {
			files = files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
		}
		files = files.filter((file) => file.name !== DEFAULT_MEMORY_FILENAME || !file.missing);
		for (const hook of this.contextHooks) {
			files = await hook({ workspaceRoot: this.rootPath, files });
		}
		return files;
	}

	async listWorkspaceFiles(): Promise<WorkspaceFileSummary[]> {
		await this.ensureReady();
		const files = await Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map(async (name) => {
				const filePath = path.join(this.rootPath, name);
				try {
					const stat = await fs.lstat(filePath);
					return { name, path: filePath, missing: false, size: stat.size };
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
					return { name, path: filePath, missing: true };
				}
			})
		);
		return files;
	}

	async readWorkspaceFile(name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await this.ensureReady();
		return safeReadWorkspaceFile(this.rootPath, name);
	}

	async writeWorkspaceFile(name: string, content: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		if (Buffer.byteLength(content, 'utf8') > MAX_WORKSPACE_CONTEXT_FILE_BYTES) {
			throw new Error(`Workspace file exceeds ${MAX_WORKSPACE_CONTEXT_FILE_BYTES} bytes: ${name}`);
		}
		await this.ensureReady();
		const filePath = path.join(this.rootPath, name);
		await this.assertSafeWritableWorkspaceFile(name, filePath);
		await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
		return safeReadWorkspaceFile(this.rootPath, name);
	}

	async isBootstrapPending(): Promise<boolean> {
		await this.ensureReady();
		const state = await this.readSetupState();
		if (state.setupCompletedAt) return false;
		return this.exists(DEFAULT_BOOTSTRAP_FILENAME);
	}

	async completeBootstrap(): Promise<WorkspaceContextFile> {
		await this.ensureReady();
		await fs.rm(path.join(this.rootPath, DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		await this.markSetupCompleted();
		return this.readWorkspaceFile(DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async isBrandNewWorkspace(): Promise<boolean> {
		try {
			const entries = await fs.readdir(this.rootPath);
			return entries.length === 0;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
			throw error;
		}
	}

	private async ensureGitRepo(brandNewWorkspace: boolean): Promise<void> {
		if (!brandNewWorkspace) return;
		if (await this.pathExists(path.join(this.rootPath, '.git'))) return;
		try {
			await execFileAsync('git', ['--version'], { timeout: 2_000 });
			await execFileAsync('git', ['init'], { cwd: this.rootPath, timeout: 10_000 });
		} catch {
			this.logger.debug('WorkspaceService', 'Skipping git initialization', {
				rootPath: this.rootPath,
			});
		}
	}

	private async ensureBootstrapFiles(options: { skipOptionalBootstrapFiles: string[] }): Promise<void> {
		const skipOptionalBootstrapFiles = new Set(options.skipOptionalBootstrapFiles);
		const optionalTemplateFiles = new Set<string>(OPTIONAL_WORKSPACE_TEMPLATE_FILE_NAMES);
		const shouldWriteTemplate = (name: WorkspaceFileName): boolean =>
			!optionalTemplateFiles.has(name) || !skipOptionalBootstrapFiles.has(name);

		for (const name of SEEDED_WORKSPACE_FILE_NAMES) {
			if (!shouldWriteTemplate(name)) continue;
			await writeFileIfMissing(
				path.join(this.rootPath, name),
				await loadWorkspaceTemplate(name)
			);
		}

		let state = await this.readSetupState();
		let stateDirty = false;
		const bootstrapPath = path.join(this.rootPath, DEFAULT_BOOTSTRAP_FILENAME);
		let bootstrapExists = await this.pathExists(bootstrapPath);
		const now = (): string => new Date().toISOString();
		const markState = (next: Partial<WorkspaceSetupState>): void => {
			state = { ...state, ...next };
			stateDirty = true;
		};

		if (!state.bootstrapSeededAt && bootstrapExists) {
			markState({ bootstrapSeededAt: now() });
		}

		if (!state.setupCompletedAt && state.bootstrapSeededAt && !bootstrapExists) {
			markState({ setupCompletedAt: now() });
		}

		if (
			!state.setupCompletedAt &&
			bootstrapExists &&
			(await this.workspaceProfileLooksConfigured({ includeGitEvidence: false }))
		) {
			await fs.rm(bootstrapPath, { force: true });
			bootstrapExists = false;
			markState({
				bootstrapSeededAt: state.bootstrapSeededAt ?? now(),
				setupCompletedAt: now(),
			});
		}

		if (!state.bootstrapSeededAt && !state.setupCompletedAt && !bootstrapExists) {
			if (await this.workspaceProfileLooksConfigured({ includeGitEvidence: true })) {
				markState({ setupCompletedAt: now() });
			} else {
				const wrote = await writeFileIfMissing(
					bootstrapPath,
					await loadWorkspaceTemplate(DEFAULT_BOOTSTRAP_FILENAME)
				);
				bootstrapExists = wrote || (await this.pathExists(bootstrapPath));
				if (bootstrapExists) markState({ bootstrapSeededAt: now() });
			}
		}

		if (stateDirty) await this.writeSetupState(state);
	}

	private async workspaceProfileLooksConfigured(options: {
		includeGitEvidence: boolean;
	}): Promise<boolean> {
		for (const name of WORKSPACE_PROFILE_FILENAMES) {
			if (
				await this.fileContentDiffersFromTemplate(
					path.join(this.rootPath, name),
					await loadWorkspaceTemplate(name)
				)
			) {
				return true;
			}
		}

		if (await this.pathExists(path.join(this.rootPath, 'memory'))) return true;
		if (await this.exactRootEntryExists(DEFAULT_MEMORY_FILENAME)) return true;
		return options.includeGitEvidence && (await this.pathExists(path.join(this.rootPath, '.git')));
	}

	private async fileContentDiffersFromTemplate(filePath: string, template: string): Promise<boolean> {
		try {
			return (await fs.readFile(filePath, 'utf8')) !== template;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			return false;
		}
	}

	private async exactRootEntryExists(name: string): Promise<boolean> {
		try {
			const entries = await fs.readdir(this.rootPath);
			return entries.includes(name);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}

	private async markSetupCompleted(): Promise<void> {
		const state = await this.readSetupState();
		await this.writeSetupState({
			...state,
			setupCompletedAt: state.setupCompletedAt ?? new Date().toISOString(),
		});
	}

	private async readSetupState(): Promise<WorkspaceSetupState> {
		try {
			const raw = await fs.readFile(this.statePath(), 'utf8');
			const parsed = JSON.parse(raw) as Partial<WorkspaceSetupState>;
			return {
				version: WORKSPACE_STATE_VERSION,
				bootstrapSeededAt:
					typeof parsed.bootstrapSeededAt === 'string' ? parsed.bootstrapSeededAt : undefined,
				setupCompletedAt:
					typeof parsed.setupCompletedAt === 'string' ? parsed.setupCompletedAt : undefined,
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return { version: WORKSPACE_STATE_VERSION };
			}
			if (error instanceof SyntaxError) {
				return { version: WORKSPACE_STATE_VERSION };
			}
			throw error;
		}
	}

	private async writeSetupState(state: WorkspaceSetupState): Promise<void> {
		const statePath = this.statePath();
		await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
		await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: 'utf8',
			mode: 0o600,
		});
	}

	private statePath(): string {
		return path.join(this.rootPath, WORKSPACE_STATE_DIRNAME, WORKSPACE_STATE_FILENAME);
	}

	private async assertSafeWritableWorkspaceFile(
		name: WorkspaceFileName,
		filePath: string
	): Promise<void> {
		const rootPath = path.resolve(this.rootPath);
		if (!isPathInside(rootPath, filePath)) {
			throw new Error(`Workspace file resolves outside root: ${name}`);
		}
		try {
			const stat = await fs.lstat(filePath);
			if (stat.isSymbolicLink()) throw new Error(`Refusing to write symlink: ${name}`);
			if (!stat.isFile()) throw new Error(`Refusing to write non-file: ${name}`);
			if (stat.nlink > 1) throw new Error(`Refusing to write hard-linked file: ${name}`);
			const [rootRealPath, fileRealPath] = await Promise.all([
				fs.realpath(this.rootPath),
				fs.realpath(filePath),
			]);
			if (!isPathInside(rootRealPath, fileRealPath)) {
				throw new Error(`Workspace file resolves outside root: ${name}`);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		}
	}

	private async pathExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
}

export function resolveBootstrapMode(params: {
	bootstrapPending: boolean;
	isInteractiveUserFacing: boolean;
	isPrimaryRun: boolean;
	isCanonicalWorkspace: boolean;
	hasBootstrapFileAccess: boolean;
	runKind?: 'default' | 'heartbeat' | 'cron';
}): BootstrapMode {
	if (!params.bootstrapPending) return 'none';
	if (params.runKind === 'heartbeat' || params.runKind === 'cron') return 'none';
	if (!params.isInteractiveUserFacing || !params.isPrimaryRun) return 'none';
	if (!params.hasBootstrapFileAccess) return 'limited';
	return params.isCanonicalWorkspace ? 'full' : 'limited';
}

export function renderWorkspaceContextFiles(
	files: WorkspaceContextFile[],
	options: { maxChars?: number; totalMaxChars?: number } = {}
): string {
	const maxChars = options.maxChars ?? DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS;
	let remaining = options.totalMaxChars ?? DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS;
	const blocks: string[] = [];

	for (const file of [...files].sort(compareContextFilesForPrompt)) {
		if (remaining <= 0) break;
		const content = file.missing
			? `[MISSING] Expected at: ${file.path}${file.detail ? ` (${file.detail})` : ''}`
			: file.content ?? '';
		const trimmed = trimWithMarker(content.trimEnd(), file.name, Math.min(maxChars, remaining));
		remaining -= trimmed.length;
		const note =
			file.name === 'SOUL.md'
				? '\nNote: persona/tone guidance only; higher-priority instructions override it.'
				: '';
		blocks.push(
			[`<workspace_file name="${file.name}" path="${file.path}">`, trimmed, `${note}</workspace_file>`].join('\n')
		);
	}

	return blocks.join('\n\n');
}

function compareContextFilesForPrompt(a: WorkspaceContextFile, b: WorkspaceContextFile): number {
	const aOrder = CONTEXT_FILE_PROMPT_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
	const bOrder = CONTEXT_FILE_PROMPT_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;
	if (aOrder !== bOrder) return aOrder - bOrder;
	return a.path.localeCompare(b.path);
}

function trimWithMarker(content: string, fileName: string, maxChars: number): string {
	if (content.length <= maxChars) return content;
	const marker = `\n[...truncated ${fileName}; read the file for full content...]\n`;
	const budget = Math.max(0, maxChars - marker.length);
	const head = Math.floor(budget * 0.75);
	const tail = budget - head;
	return `${content.slice(0, head)}${marker}${tail > 0 ? content.slice(-tail) : ''}`;
}
