import fs from 'node:fs/promises';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Service } from 'typedi';
import { Workspace } from '../../agent';
import { resolveAgentUsageLocation } from '../../agent/shared/location';

const AGENT_FILE = 'AGENTS.md'
const BOOTSTRAP_FILE = 'BOOTSTRAP.md'
const HEARTBEAT_FILE = 'HEARTBEAT.md'
const IDENTITY_FILE = 'IDENTITY.md'
const MEMORY_FILE = 'MEMORY.md'
const SOUL_FILE = 'SOUL.md'
const TOOLS_FILE = 'TOOLS.md'
const USER_FILE = 'USER.md'

@Service()
export class WorkspaceService extends Workspace {
	private readonly workspacePath = path.resolve(resolveAgentUsageLocation(), 'workspace');

	constructor() {
		super();
		if (!existsSync(this.workspacePath)) {
			mkdirSync(this.workspacePath, { recursive: true });
		}
		this.ensureWorkspaceFiles();
	}

	getPath(): string {
		return this.workspacePath;
	}

	async getAgentText(): Promise<string> {
		return this.readTextFile(AGENT_FILE);
	}

	async getBootstrapText(): Promise<string> {
		return this.readTextFile(BOOTSTRAP_FILE);
	}

	async getIdentityText(): Promise<string> {
		return this.readTextFile(IDENTITY_FILE);
	}

	async getSoulText(): Promise<string> {
		return this.readTextFile(SOUL_FILE);
	}

	async getToolsText(): Promise<string> {
		return this.readTextFile(TOOLS_FILE);
	}

	async getUserText(): Promise<string> {
		return this.readTextFile(USER_FILE);
	}

	async getMemoryText(): Promise<string> {
		return this.readTextFile(MEMORY_FILE);
	}

	async setIdentityText(content: string): Promise<void> {
		await fs.writeFile(this.resolveWorkspacePath(IDENTITY_FILE), content, 'utf8');
	}

	async fileExists(filePath: string): Promise<boolean> {
		try {
			await fs.access(this.resolveWorkspacePath(filePath));
			return true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
			throw error;
		}
	}

	hasBootstrapFile(): Promise<boolean> {
		return this.fileExists(BOOTSTRAP_FILE);
	}

	private ensureWorkspaceFiles(): void {
		this.ensureWorkspaceFile(AGENT_FILE);
		this.ensureWorkspaceFile(BOOTSTRAP_FILE);
		this.ensureWorkspaceFile(HEARTBEAT_FILE);
		this.ensureWorkspaceFile(IDENTITY_FILE);
		this.ensureWorkspaceFile(MEMORY_FILE);
		this.ensureWorkspaceFile(SOUL_FILE);
		this.ensureWorkspaceFile(TOOLS_FILE);
		this.ensureWorkspaceFile(USER_FILE);
	}

	private ensureWorkspaceFile(filePath: string): void {
		const workspaceFilePath = this.resolveWorkspacePath(filePath);
		if (existsSync(workspaceFilePath)) return;
		copyFileSync(this.resolveTemplatePath(filePath), workspaceFilePath);
	}

	private async readTextFile(filePath: string): Promise<string> {
		try {
			return await fs.readFile(this.resolveWorkspacePath(filePath), 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
			throw error;
		}
	}

	private resolveWorkspacePath(filePath: string): string {
		if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
			throw new Error(`Workspace file path must be relative: ${filePath}`);
		}
		const resolvedPath = path.resolve(this.workspacePath, filePath);
		const relativePath = path.relative(this.workspacePath, resolvedPath);
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Workspace file path resolves outside workspace: ${filePath}`);
		}
		return resolvedPath;
	}

	private resolveTemplatePath(filePath: string): string {
		const templatePath = path.join('resources', 'templates', filePath);
		const developmentPath = path.resolve(process.cwd(), templatePath);
		if (existsSync(developmentPath)) return developmentPath;
		return path.join(process.resourcesPath, templatePath);
	}
}
