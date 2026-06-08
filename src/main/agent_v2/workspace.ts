import fs from 'node:fs/promises';
import path from 'node:path';
import { AgentWorkspace } from './core/workspace';

export const BOOTSTRAP_FILE = 'BOOTSTRAP.md';

export class Workspace extends AgentWorkspace {
	private readonly workspacePath: string;

	constructor(workspacePath: string) {
		super();
		this.workspacePath = path.resolve(workspacePath);
	}

	getWorkspacePath(): string {
		return this.workspacePath;
	}

	getPath(): string {
		return this.workspacePath;
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
