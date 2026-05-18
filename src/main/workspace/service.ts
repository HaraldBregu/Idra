import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { LoggerService } from '../logger';
import { resolveDefaultUserDataPath } from '../user-data';
import type { ReadFileOptions, WorkspaceServiceOptions, WriteFileOptions } from './types';
import {
	DEFAULT_BOOTSTRAP_FILENAME,
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
	type OptionalWorkspaceTemplateFileName,
	type WorkspaceContextFile,
	type WorkspaceFileName,
	type WorkspaceFileSummary,
} from './files';

const execFileAsync = promisify(execFile);
const WORKSPACE_STATE_DIRNAME = '.friday';
const WORKSPACE_STATE_FILENAME = 'workspace-state.json';
const WORKSPACE_STATE_VERSION = 1;

type WorkspaceSetupState = {
	version: typeof WORKSPACE_STATE_VERSION;
	bootstrapSeededAt?: string;
	setupCompletedAt?: string;
};

export type EnsureWorkspaceOptions = {
	skipBootstrap?: boolean;
	skipOptionalFiles?: OptionalWorkspaceTemplateFileName[];
	initializeGit?: boolean;
};

export type BootstrapMode = 'none' | 'limited' | 'full';

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
		await this.ensureReady({ skipBootstrap: name === DEFAULT_BOOTSTRAP_FILENAME });
		const filePath = path.join(this.rootPath, name);
		await this.assertSafeWritableWorkspaceFile(name, filePath);
		await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
		return this.readWorkspaceFile(name);
	}

	async isBootstrapPending(): Promise<boolean> {
		await this.ensureReady();
		const state = await this.readSetupState();
		if (state.setupCompletedAt) return false;
		return this.exists(DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async seedWorkspaceFiles(options: EnsureWorkspaceOptions): Promise<void> {
		const skipped = new Set(options.skipOptionalFiles ?? []);
		const optional = new Set<string>(OPTIONAL_WORKSPACE_TEMPLATE_FILE_NAMES);
		for (const name of SEEDED_WORKSPACE_FILE_NAMES) {
			if (optional.has(name) && skipped.has(name as OptionalWorkspaceTemplateFileName)) continue;
			await writeFileIfMissing(
				path.join(this.rootPath, name),
				await loadWorkspaceTemplate(name as WorkspaceFileName)
			);
		}
	}

	private async reconcileBootstrapState(options: EnsureWorkspaceOptions): Promise<void> {
		const statePath = this.statePath();
		let state = await this.readSetupState();
		let dirty = false;
		const bootstrapPath = path.join(this.rootPath, DEFAULT_BOOTSTRAP_FILENAME);
		const bootstrapExists = await this.pathExists(bootstrapPath);
		const now = (): string => new Date().toISOString();

		if (state.setupCompletedAt) return;

		if (state.bootstrapSeededAt && !bootstrapExists) {
			state = { ...state, setupCompletedAt: now() };
			dirty = true;
		}

		if (!state.bootstrapSeededAt && bootstrapExists) {
			state = { ...state, bootstrapSeededAt: now() };
			dirty = true;
		}

		if (!options.skipBootstrap && !state.bootstrapSeededAt && !state.setupCompletedAt) {
			const wrote = await writeFileIfMissing(
				bootstrapPath,
				await loadWorkspaceTemplate(DEFAULT_BOOTSTRAP_FILENAME)
			);
			if (wrote || (await this.pathExists(bootstrapPath))) {
				state = { ...state, bootstrapSeededAt: now() };
				dirty = true;
			}
		}

		if (dirty) {
			await this.writeSetupState(statePath, state);
		}
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
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger.warn('WorkspaceService', 'Could not read workspace state', {
					error: (error as Error).message,
				});
			}
			return { version: WORKSPACE_STATE_VERSION };
		}
	}

	private async writeSetupState(statePath: string, state: WorkspaceSetupState): Promise<void> {
		await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
		await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: 'utf8',
			mode: 0o600,
		});
	}

	private statePath(): string {
		return path.join(this.rootPath, WORKSPACE_STATE_DIRNAME, WORKSPACE_STATE_FILENAME);
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

	private async assertSafeWritableWorkspaceFile(
		name: WorkspaceFileName,
		filePath: string
	): Promise<void> {
		const rootRealPath = await fs.realpath(this.rootPath);
		if (!isPathInside(rootRealPath, filePath)) {
			throw new Error(`Workspace file resolves outside root: ${name}`);
		}
		try {
			const stat = await fs.lstat(filePath);
			if (stat.isSymbolicLink()) throw new Error(`Refusing to write symlink: ${name}`);
			if (!stat.isFile()) throw new Error(`Refusing to write non-file: ${name}`);
			if (stat.nlink > 1) throw new Error(`Refusing to write hard-linked file: ${name}`);
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

	for (const file of files) {
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

function trimWithMarker(content: string, fileName: string, maxChars: number): string {
	if (content.length <= maxChars) return content;
	const marker = `\n[...truncated ${fileName}; read the file for full content...]\n`;
	const budget = Math.max(0, maxChars - marker.length);
	const head = Math.floor(budget * 0.75);
	const tail = budget - head;
	return `${content.slice(0, head)}${marker}${tail > 0 ? content.slice(-tail) : ''}`;
}
