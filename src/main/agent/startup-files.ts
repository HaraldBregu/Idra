import fs from 'node:fs/promises';
import path from 'node:path';
import type { LoggerService } from '../logger';
import {
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_MEMORY_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_USER_FILENAME,
	MAX_WORKSPACE_CONTEXT_FILE_BYTES,
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
} from '../workspace/files';
import { resolveDefaultAgentDataPath } from './storage';

export interface AgentStartupFilesServiceOptions {
	rootPath?: string;
	logger?: Pick<LoggerService, 'debug' | 'warn'>;
}

export interface AgentStartupFilesServicePort {
	getRootPath(agentId: string): string;
	ensureReady(agentId: string): Promise<void>;
	isBootstrapPending(agentId: string): Promise<boolean>;
	loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]>;
	listFiles(agentId: string): Promise<WorkspaceFileSummary[]>;
	readFile(agentId: string, name: string): Promise<WorkspaceContextFile>;
	writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile>;
	completeBootstrap(agentId: string): Promise<WorkspaceContextFile>;
}

const STATE_DIRNAME = '.friday';
const STATE_FILENAME = 'startup-state.json';
const STATE_VERSION = 1;

type StartupState = {
	version: typeof STATE_VERSION;
	bootstrapSeededAt?: string;
	setupCompletedAt?: string;
};

const PROFILE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const satisfies readonly WorkspaceFileName[];

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly rootPath: string;
	private readonly logger?: Pick<LoggerService, 'debug' | 'warn'>;

	constructor(options: AgentStartupFilesServiceOptions = {}) {
		this.rootPath = options.rootPath ?? resolveDefaultAgentDataPath('workspaces');
		this.logger = options.logger;
	}

	getRootPath(agentId: string): string {
		const id = agentId.trim();
		if (!id) throw new Error('Agent id is required.');
		return path.join(this.rootPath, encodeURIComponent(id));
	}

	async ensureReady(agentId: string): Promise<void> {
		const root = this.getRootPath(agentId);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });

		let state = await this.readState(root);
		let stateDirty = false;
		const markState = (patch: Partial<StartupState>): void => {
			state = { ...state, ...patch };
			stateDirty = true;
		};
		const now = (): string => new Date().toISOString();
		const bootstrapPath = path.join(root, DEFAULT_BOOTSTRAP_FILENAME);
		let bootstrapExists = await pathExists(bootstrapPath);

		for (const fileName of SEEDED_WORKSPACE_FILE_NAMES) {
			await writeFileIfMissing(path.join(root, fileName), await loadWorkspaceTemplate(fileName));
		}

		if (!state.bootstrapSeededAt && bootstrapExists) {
			markState({ bootstrapSeededAt: now() });
		}

		if (!state.setupCompletedAt && state.bootstrapSeededAt && !bootstrapExists) {
			markState({ setupCompletedAt: now() });
		}

		if (
			!state.setupCompletedAt &&
			bootstrapExists &&
			(await this.profileLooksConfigured(root))
		) {
			await fs.rm(bootstrapPath, { force: true });
			bootstrapExists = false;
			markState({
				bootstrapSeededAt: state.bootstrapSeededAt ?? now(),
				setupCompletedAt: now(),
			});
		}

		if (!state.bootstrapSeededAt && !state.setupCompletedAt && !bootstrapExists) {
			if (await this.profileLooksConfigured(root)) {
				markState({ setupCompletedAt: now() });
			} else {
				const wroteBootstrap = await writeFileIfMissing(
					bootstrapPath,
					await loadWorkspaceTemplate(DEFAULT_BOOTSTRAP_FILENAME)
				);
				bootstrapExists = wroteBootstrap || (await pathExists(bootstrapPath));
				if (bootstrapExists) {
					markState({ bootstrapSeededAt: now() });
				}
			}
		}

		if (stateDirty) {
			await this.writeState(root, state);
		}
		this.logger?.debug?.('AgentStartupFilesService', 'Startup files ready', {
			agentId,
			root,
			bootstrapPending: bootstrapExists && !state.setupCompletedAt,
		});
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const state = await this.readState(root);
		if (state.setupCompletedAt) return false;
		return pathExists(path.join(root, DEFAULT_BOOTSTRAP_FILENAME));
	}

	async loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const state = await this.readState(root);
		let files = await Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map((name) => safeReadWorkspaceFile(root, name))
		);
		if (state.setupCompletedAt) {
			files = files.filter((file) => file.name !== DEFAULT_BOOTSTRAP_FILENAME);
		}
		return files.filter((file) => file.name !== DEFAULT_MEMORY_FILENAME || !file.missing);
	}

	async listFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		return Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map(async (name) => {
				const filePath = path.join(root, name);
				try {
					const stat = await fs.lstat(filePath);
					return { name, path: filePath, missing: false, size: stat.size };
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
					return { name, path: filePath, missing: true };
				}
			})
		);
	}

	async readFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await this.ensureReady(agentId);
		return safeReadWorkspaceFile(this.getRootPath(agentId), name);
	}

	async writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		if (Buffer.byteLength(content, 'utf8') > MAX_WORKSPACE_CONTEXT_FILE_BYTES) {
			throw new Error(`Startup file exceeds ${MAX_WORKSPACE_CONTEXT_FILE_BYTES} bytes: ${name}`);
		}
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const filePath = path.join(root, name);
		await assertSafeWritableStartupFile(root, name, filePath);
		await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
		return safeReadWorkspaceFile(root, name);
	}

	async completeBootstrap(agentId: string): Promise<WorkspaceContextFile> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		await fs.rm(path.join(root, DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		const state = await this.readState(root);
		await this.writeState(root, {
			...state,
			setupCompletedAt: state.setupCompletedAt ?? new Date().toISOString(),
		});
		return safeReadWorkspaceFile(root, DEFAULT_BOOTSTRAP_FILENAME);
	}

	private async profileLooksConfigured(root: string): Promise<boolean> {
		const diffs = await Promise.all(
			PROFILE_FILE_NAMES.map(async (fileName) =>
				fileContentDiffersFromTemplate(path.join(root, fileName), await loadWorkspaceTemplate(fileName))
			)
		);
		return diffs.some(Boolean) || (await this.hasExistingUserEvidence(root));
	}

	private async hasExistingUserEvidence(root: string): Promise<boolean> {
		for (const candidate of [
			path.join(root, 'memory'),
			path.join(root, '.git'),
			path.join(root, DEFAULT_MEMORY_FILENAME),
		]) {
			if (await pathExists(candidate)) return true;
		}
		return false;
	}

	private async readState(root: string): Promise<StartupState> {
		try {
			const raw = await fs.readFile(this.statePath(root), 'utf8');
			const parsed = JSON.parse(raw) as Partial<StartupState>;
			return {
				version: STATE_VERSION,
				bootstrapSeededAt:
					typeof parsed.bootstrapSeededAt === 'string' ? parsed.bootstrapSeededAt : undefined,
				setupCompletedAt:
					typeof parsed.setupCompletedAt === 'string' ? parsed.setupCompletedAt : undefined,
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) {
				return { version: STATE_VERSION };
			}
			throw error;
		}
	}

	private async writeState(root: string, state: StartupState): Promise<void> {
		const statePath = this.statePath(root);
		await fs.mkdir(path.dirname(statePath), { recursive: true, mode: 0o700 });
		await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, {
			encoding: 'utf8',
			mode: 0o600,
		});
	}

	private statePath(root: string): string {
		return path.join(root, STATE_DIRNAME, STATE_FILENAME);
	}
}

async function fileContentDiffersFromTemplate(filePath: string, template: string): Promise<boolean> {
	try {
		return (await fs.readFile(filePath, 'utf8')) !== template;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		return false;
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function assertSafeWritableStartupFile(
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
