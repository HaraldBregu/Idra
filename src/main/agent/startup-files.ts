import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveDefaultUserDataPath } from '../user-data';

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

export type WorkspaceFileName = (typeof WORKSPACE_CONTEXT_FILE_NAMES)[number];
export type BootstrapMode = 'none' | 'limited' | 'full';
export interface WorkspaceContextFile {
	name: WorkspaceFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
}
export interface WorkspaceFileSummary {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
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

const names = new Set<string>(WORKSPACE_CONTEXT_FILE_NAMES);
const defaults: Record<WorkspaceFileName, string> = {
	[DEFAULT_AGENTS_FILENAME]: '# Agent Instructions\n',
	[DEFAULT_SOUL_FILENAME]: '# Soul\n',
	[DEFAULT_IDENTITY_FILENAME]: '# Identity\n',
	[DEFAULT_USER_FILENAME]: '# User\n',
	[DEFAULT_HEARTBEAT_FILENAME]: '# Heartbeat\n',
	[DEFAULT_BOOTSTRAP_FILENAME]: '# Bootstrap\n',
	[DEFAULT_MEMORY_FILENAME]: '# Memory\n',
};

export function assertWorkspaceFileName(name: string): asserts name is WorkspaceFileName {
	if (!names.has(name)) throw new Error(`Unsupported startup file: ${name}`);
}

export function resolveBootstrapMode(files: WorkspaceContextFile[]): BootstrapMode {
	if (files.some((file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing)) return 'full';
	return 'none';
}

export class AgentStartupFilesService implements AgentStartupFilesServicePort {
	private readonly rootPath: string;

	constructor(options: { rootPath?: string } = {}) {
		this.rootPath = options.rootPath ?? resolveDefaultUserDataPath('agent', 'workspaces');
	}

	getRootPath(agentId: string): string {
		return path.join(this.rootPath, encodeURIComponent(agentId || 'main'));
	}

	async ensureReady(agentId: string): Promise<void> {
		const root = this.getRootPath(agentId);
		await fs.mkdir(root, { recursive: true, mode: 0o700 });
		await Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.filter((name) => name !== DEFAULT_MEMORY_FILENAME).map(async (name) => {
			const file = path.join(root, name);
			await fs.writeFile(file, defaults[name], { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
				if (error.code !== 'EEXIST') throw error;
			});
		}));
	}

	async isBootstrapPending(agentId: string): Promise<boolean> {
		const file = await this.readFile(agentId, DEFAULT_BOOTSTRAP_FILENAME);
		return !file.missing;
	}

	async loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		await this.ensureReady(agentId);
		return Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.map((name) => this.readFile(agentId, name)));
	}

	async listFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		await this.ensureReady(agentId);
		return Promise.all(WORKSPACE_CONTEXT_FILE_NAMES.map(async (name) => {
			const file = path.join(this.getRootPath(agentId), name);
			const stat = await fs.stat(file).catch(() => undefined);
			return { name, path: file, missing: !stat, ...(stat ? { size: stat.size } : {}) };
		}));
	}

	async readFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		const file = path.join(this.getRootPath(agentId), name);
		try {
			return { name, path: file, missing: false, content: await fs.readFile(file, 'utf8') };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { name, path: file, missing: true, error: 'missing' };
			return { name, path: file, missing: true, error: 'io', detail: error instanceof Error ? error.message : String(error) };
		}
	}

	async writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile> {
		assertWorkspaceFileName(name);
		await this.ensureReady(agentId);
		const file = path.join(this.getRootPath(agentId), name);
		await fs.writeFile(file, content, 'utf8');
		return this.readFile(agentId, name);
	}

	async completeBootstrap(agentId: string): Promise<WorkspaceContextFile> {
		await fs.rm(path.join(this.getRootPath(agentId), DEFAULT_BOOTSTRAP_FILENAME), { force: true });
		return this.readFile(agentId, DEFAULT_BOOTSTRAP_FILENAME);
	}
}
