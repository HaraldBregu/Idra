import fs from 'node:fs/promises';
import path from 'node:path';
import { Workspace } from './workspace';

export class AgentBootstrap {
	constructor(private readonly workspace = new Workspace()) {}

	getWorkspacePath(): string {
		return this.workspace.getWorkspacePath();
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

	async filesExist(filePaths: string[]): Promise<Record<string, boolean>> {
		const entries = await Promise.all(
			filePaths.map(async (filePath) => [filePath, await this.fileExists(filePath)] as const)
		);
		return Object.fromEntries(entries);
	}

	private resolveWorkspacePath(filePath: string): string {
		if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
			throw new Error(`Workspace file path must be relative: ${filePath}`);
		}
		const workspacePath = this.workspace.getWorkspacePath();
		const resolvedPath = path.resolve(workspacePath, filePath);
		const relativePath = path.relative(workspacePath, resolvedPath);
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Workspace file path resolves outside workspace: ${filePath}`);
		}
		return resolvedPath;
	}
}
