import fs from 'node:fs/promises';
import path from 'node:path';
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
	loadWorkspaceTemplate,
	safeReadWorkspaceFile,
	writeFileIfMissing,
	type WorkspaceContextFile,
	type WorkspaceFileName,
	type WorkspaceFileSummary,
} from '../../agent/workspace/files';
import { resolveDefaultAgentDataPath } from '../../data-directory';
import type {
	AgentStartupFilesServiceOptions,
	AgentStartupFilesServicePort,
} from './types';
import {
	assertSafeWritableStartupFile,
	fileContentDiffersFromTemplate,
	pathExists,
} from './utils';

const PROFILE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const satisfies readonly WorkspaceFileName[];

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly rootPath: string;
	private readonly logger?: AgentStartupFilesServiceOptions['logger'];

	constructor(options: AgentStartupFilesServiceOptions = {}) {
		this.rootPath = options.rootPath ?? resolveDefaultAgentDataPath();
		this.logger = options.logger;
	}

	getRootPath(agentId: string): string {
		const id = agentId.trim();
		if (!id) throw new Error('Agent id is required.');
		return path.join(this.rootPath, encodeURIComponent(id));
	}

	async ensureReady(agentId: string): Promise<void> {
		const root = this.getRootPath(agentId);
		const hadStartupFiles = await this.hasAnyStartupFile(root);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });

		for (const fileName of SEEDED_WORKSPACE_FILE_NAMES) {
			await writeFileIfMissing(path.join(root, fileName), await loadWorkspaceTemplate(fileName));
		}

		const bootstrapPath = path.join(root, DEFAULT_BOOTSTRAP_FILENAME);
		let bootstrapExists = await pathExists(bootstrapPath);
		const profileConfigured = await this.profileLooksConfigured(root);

		if (bootstrapExists && profileConfigured) {
			await fs.rm(bootstrapPath, { force: true });
			bootstrapExists = false;
		} else if (!bootstrapExists && profileConfigured) {
			bootstrapExists = false;
		} else if (!bootstrapExists && !hadStartupFiles) {
			const wrote = await writeFileIfMissing(
				bootstrapPath,
				await loadWorkspaceTemplate(DEFAULT_BOOTSTRAP_FILENAME)
			);
				bootstrapExists = wrote || (await pathExists(bootstrapPath));
			}

			this.logger?.debug?.('AgentStartupFilesService', 'Startup files ready', {
			agentId,
			root,
			bootstrapPending: bootstrapExists,
		});
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		return pathExists(path.join(root, DEFAULT_BOOTSTRAP_FILENAME));
	}

	async loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		await this.ensureReady(agentId);
		const root = this.getRootPath(agentId);
		const bootstrapPending = await pathExists(path.join(root, DEFAULT_BOOTSTRAP_FILENAME));
		const files = await Promise.all(
			WORKSPACE_CONTEXT_FILE_NAMES.map((name) => safeReadWorkspaceFile(root, name))
		);
		return files.filter((file) => {
			if (file.name === DEFAULT_BOOTSTRAP_FILENAME && !bootstrapPending) return false;
			if (file.name === DEFAULT_MEMORY_FILENAME && file.missing) return false;
			return true;
		});
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

	private async hasAnyStartupFile(root: string): Promise<boolean> {
		for (const fileName of WORKSPACE_CONTEXT_FILE_NAMES) {
			if (await pathExists(path.join(root, fileName))) return true;
		}
		return false;
	}
}
