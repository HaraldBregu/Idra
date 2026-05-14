import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { LoggerService } from '../logger';
import type { ReadFileOptions, WorkspaceServiceOptions, WriteFileOptions } from './types';

export class WorkspaceService {
	private readonly rootPath: string;

	constructor(
		private readonly logger: LoggerService,
		options: WorkspaceServiceOptions = {}
	) {
		this.rootPath =
			options.rootPath ??
			path.join(app.getPath('home'), options.workspaceName ?? `${app.getName()}`);
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

	async ensureReady(): Promise<void> {
		await fs.mkdir(this.rootPath, { recursive: true });
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
}
