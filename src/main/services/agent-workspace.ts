import fs from 'node:fs/promises';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Workspace } from '../agent';

const AGENT_FILE = 'AGENTS.md'
const BOOTSTRAP_FILE = 'BOOTSTRAP.md'
const IDENTITY_FILE = 'IDENTITY.md'
const USER_FILE = 'USER.md'
const SOUL_FILE = 'SOUL.md'
const TOOLS_FILE = 'TOOLS.md'
const HEARTBEAT_FILE = 'HEARTBEAT.md'
const MEMORY_FILE = 'MEMORY.md'

export class AgentWorkspace extends Workspace {
	private readonly workspacePath: string;

	constructor(location: string, name = 'workspace') {
		super();
		this.workspacePath = path.resolve(location, name);
		if (!existsSync(this.workspacePath)) {
			mkdirSync(this.workspacePath, { recursive: true });
		}
		this.ensureAgentFile();
	}

	getPath(): string {
		return this.workspacePath;
	}

	async getAgentText(): Promise<string> {
		const parts: string[] = [];
		await this.appendTextFile(parts, AGENT_FILE);
		await this.appendTextFile(parts, BOOTSTRAP_FILE);
		await this.appendTextFile(parts, IDENTITY_FILE);
		await this.appendTextFile(parts, USER_FILE);
		await this.appendTextFile(parts, SOUL_FILE);
		await this.appendTextFile(parts, TOOLS_FILE);
		await this.appendTextFile(parts, HEARTBEAT_FILE);
		await this.appendTextFile(parts, MEMORY_FILE);
		return parts.join('\n\n');
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

	private ensureAgentFile(): void {
		const agentFilePath = this.resolveWorkspacePath(AGENT_FILE);
		if (existsSync(agentFilePath)) return;
		copyFileSync(this.resolveTemplatePath(AGENT_FILE), agentFilePath);
	}

	private async readTextFile(filePath: string): Promise<string> {
		try {
			return await fs.readFile(this.resolveWorkspacePath(filePath), 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
			throw error;
		}
	}

	private async appendTextFile(parts: string[], filePath: string): Promise<void> {
		const text = await this.readTextFile(filePath);
		if (text.trim()) parts.push(`## ${filePath}\n${text.trim()}`);
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
