import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
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
	}

	getPath(): string {
		return this.workspacePath;
	}

	async getAgentText(): Promise<string> {
		const parts: string[] = [];
		for (const filePath of AGENT_TEXT_FILES) {
			const text = await this.readTextFile(filePath);
			if (text.trim()) parts.push(`## ${filePath}\n${text.trim()}`);
		}
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
}
