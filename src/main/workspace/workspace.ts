import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Disposable } from '../core/service-container';
import type { WorkspaceService } from './workspace-service';
import type {
	OutputFilesService,
	OutputFile,
	OutputType,
	SaveOutputFileInput,
	SaveOutputFileResult,
} from './output-files';
import { VALID_OUTPUT_TYPES } from './output-files';
import type { LoggerService } from '../logger';
import type {
	FsReadFileParams,
	FsWriteFileParams,
	FsCreateFolderParams,
	FsDeleteFolderParams,
	FsDeleteFileParams,
	FsRenameParams,
	FsRenameResult,
	FsListDirParams,
	FsListDirEntry,
	ProjectWorkspaceInfo,
	EditorMaxWidthType,
	EditorFontType,
	DocumentConfig,
	WorkspaceInfo,
} from '../../shared/types';
import type { ProjectWorkspaceService } from './project-workspace';
import { FileManager } from '../shared/file_manager';

/**
 * Workspace is a Facade over all workspace domain services.
 *
 * It centralizes workspace operations so that the IPC layer becomes a thin
 * pass-through with no business logic. Electron-specific APIs (dialog, shell)
 * remain in the IPC layer; this class has no Electron dependency.
 */
export class Workspace implements Disposable {
	constructor(
		private readonly workspace: WorkspaceService,
		private readonly outputFiles: OutputFilesService,
		private readonly projectWorkspace: ProjectWorkspaceService,
		private readonly logger: LoggerService
	) {}

	destroy(): void {
		// No-op: sub-services manage their own lifecycle via ServiceContainer
	}

	// -------------------------------------------------------------------------
	// Workspace state
	// -------------------------------------------------------------------------

	getCurrent(): string | null {
		return this.workspace.getCurrent();
	}

	async setCurrent(workspacePath: string): Promise<void> {
		this.logger.info('Workspace', `Setting workspace: ${workspacePath}`);
		this.workspace.setCurrent(workspacePath);
		await this.ensureWorkspaceSubfolders(workspacePath);
		await this.projectWorkspace.getOrCreate();
	}

	/**
	 * List every managed workspace under `{home}/Friday/workspaces/`. Each entry is
	 * enriched with project name + description from workspace.json's `project`
	 * block (null when missing/unreadable). Sorted most-recently-opened first;
	 * never-opened workspaces fall back to alphabetical order at the end.
	 */
	async listWorkspaces(): Promise<WorkspaceInfo[]> {
		const folders = this.workspace.listWorkspaceFolders();
		const enriched = await Promise.all(
			folders.map(async (f) => {
				const info = await this.projectWorkspace.readAt(f.path);
				return {
					id: f.id,
					path: f.path,
					lastOpened: f.lastOpened,
					name: info?.name ?? null,
					description: info?.description ?? null,
				} satisfies WorkspaceInfo;
			})
		);
		return enriched.sort((a, b) => {
			if (a.lastOpened === 0 && b.lastOpened === 0) return a.id.localeCompare(b.id);
			return b.lastOpened - a.lastOpened;
		});
	}

	/**
	 * Create a new managed workspace with the supplied name and description.
	 * Allocates a UUID-named folder, writes the workspace.json `project` block,
	 * and returns the full WorkspaceInfo. Does NOT activate the workspace —
	 * caller decides whether to follow up with `setCurrent`.
	 */
	async createWorkspace(name: string, description: string = ''): Promise<WorkspaceInfo> {
		const { id, path: workspacePath } = this.workspace.createWorkspaceFolder();
		try {
			const info = await this.projectWorkspace.createAt(workspacePath, name, description);
			await this.ensureWorkspaceSubfolders(workspacePath);
			this.logger.info('Workspace', `Created workspace "${info.name}" at: ${workspacePath}`);
			return {
				id,
				path: workspacePath,
				lastOpened: 0,
				name: info.name,
				description: info.description,
			};
		} catch (err) {
			// Roll back the empty folder if metadata write fails so we don't leave
			// orphan workspaces under {home}/Friday/workspaces/.
			await fsPromises.rm(workspacePath, { recursive: true, force: true }).catch(() => undefined);
			throw err;
		}
	}

	clear(): void {
		this.workspace.clear();
	}

	// -------------------------------------------------------------------------
	// Document folder
	// -------------------------------------------------------------------------

	getDocumentFolderPath(documentId: string): string {
		if (!documentId || typeof documentId !== 'string') {
			throw new Error('Invalid document ID: must be a non-empty string');
		}
		const currentWorkspace = this.requireWorkspace();
		const documentDir = path.join(currentWorkspace, 'documents', documentId);
		if (!fs.existsSync(documentDir) || !fs.statSync(documentDir).isDirectory()) {
			throw new Error(`Document folder does not exist for ID "${documentId}".`);
		}
		return documentDir;
	}

	// -------------------------------------------------------------------------
	// Project workspace info
	// -------------------------------------------------------------------------

	async getProjectInfo(): Promise<ProjectWorkspaceInfo | null> {
		if (!this.workspace.getCurrent()) {
			return null;
		}
		return this.projectWorkspace.getOrCreate();
	}

	async updateProjectName(name: string): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateName(name);
	}

	async updateProjectDescription(description: string): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateDescription(description);
	}

	async updateMaxWidthType(value: EditorMaxWidthType): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateMaxWidthType(value);
	}

	async updateFontType(value: EditorFontType): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateFontType(value);
	}

	async updateTextSize(percentage: number): Promise<ProjectWorkspaceInfo> {
		return this.projectWorkspace.updateTextSize(percentage);
	}

	// -------------------------------------------------------------------------
	// Document config
	// -------------------------------------------------------------------------

	async getDocumentConfig(documentId: string): Promise<DocumentConfig> {
		const docPath = this.getDocumentFolderPath(documentId);
		const configFilePath = path.join(docPath, 'config.json');

		type StoredJson = {
			title?: string;
			type?: string;
			createdAt?: string;
			updatedAt?: string;
		};

		let stored: StoredJson = {};
		try {
			const raw = await fsPromises.readFile(configFilePath, 'utf-8');
			stored = JSON.parse(raw) as StoredJson;
		} catch {
			// config.json doesn't exist yet
		}

		return {
			title: stored.title ?? '',
			type: stored.type ?? '',
			createdAt: stored.createdAt ?? '',
			updatedAt: stored.updatedAt ?? '',
		};
	}

	// -------------------------------------------------------------------------
	// Document content
	// -------------------------------------------------------------------------

	async getDocumentContent(documentId: string): Promise<string> {
		const docPath = this.getDocumentFolderPath(documentId);
		const contentFilePath = path.join(docPath, 'content.json');

		try {
			return await fsPromises.readFile(contentFilePath, 'utf-8');
		} catch {
			return '';
		}
	}

	/**
	 * Write a document's content to disk and bump `updatedAt` in config.json
	 * (if it already exists).
	 */
	async updateDocumentContent(documentId: string, content: string): Promise<void> {
		const docPath = this.getDocumentFolderPath(documentId);
		const contentFilePath = path.join(docPath, 'content.json');
		const configFilePath = path.join(docPath, 'config.json');
		const manager = this.buildFileManager();

		await fsPromises.writeFile(contentFilePath, content, 'utf-8');

		let existing: Record<string, unknown> = {};
		try {
			const raw = await fsPromises.readFile(configFilePath, 'utf-8');
			existing = JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return;
		}

		existing.updatedAt = new Date().toISOString();
		await manager.writeFile(configFilePath, JSON.stringify(existing, null, 2));
	}

	/**
	 * Merge a partial config into the document's config.json and bump `updatedAt`.
	 */
	async updateDocumentConfig(
		documentId: string,
		config: Partial<DocumentConfig>
	): Promise<void> {
		const docPath = this.getDocumentFolderPath(documentId);
		const configFilePath = path.join(docPath, 'config.json');
		const manager = this.buildFileManager();

		let existing: Record<string, unknown> = {};
		try {
			const raw = await fsPromises.readFile(configFilePath, 'utf-8');
			existing = JSON.parse(raw) as Record<string, unknown>;
		} catch {
			// config.json not present yet — we'll create it below
		}

		if (config.title !== undefined) {
			existing.title = config.title;
		}

		existing.updatedAt = new Date().toISOString();
		await manager.writeFile(configFilePath, JSON.stringify(existing, null, 2));
	}

	// -------------------------------------------------------------------------
	// Output files
	// -------------------------------------------------------------------------

	async saveOutput(input: SaveOutputFileInput): Promise<SaveOutputFileResult> {
		this.validateOutputInput(input);
		const result = await this.outputFiles.save(input);
		this.logger.info('Workspace', `Saved output file for type ${input.type}: ${result.id}`);
		return result;
	}

	async loadOutputs(): Promise<OutputFile[]> {
		const files = await this.outputFiles.loadAll();
		this.logger.info('Workspace', `Loaded ${files.length} output files`);
		return files;
	}

	async loadOutputsByType(outputType: string): Promise<OutputFile[]> {
		this.validateOutputType(outputType);
		const files = await this.outputFiles.loadByType(outputType as OutputType);
		this.logger.info('Workspace', `Loaded ${files.length} output files for type "${outputType}"`);
		return files;
	}

	async loadOutput(params: { type: string; id: string }): Promise<OutputFile | null> {
		this.validateOutputTypeAndId(params);
		const file = await this.outputFiles.loadOne(params.type as OutputType, params.id);
		this.logger.info(
			'Workspace',
			file
				? `Loaded output file: ${params.type}/${params.id}`
				: `Output file not found: ${params.type}/${params.id}`
		);
		return file;
	}

	async deleteOutput(params: { type: string; id: string }): Promise<void> {
		this.validateOutputTypeAndId(params);
		await this.outputFiles.delete(params.type as OutputType, params.id);
		this.logger.info('Workspace', `Deleted output file: ${params.type}/${params.id}`);
	}

	async trashOutput(params: { type: string; id: string }): Promise<void> {
		this.validateOutputTypeAndId(params);
		await this.outputFiles.trash(params.type as OutputType, params.id);
		this.logger.info('Workspace', `Trashed output file: ${params.type}/${params.id}`);
	}

	// -------------------------------------------------------------------------
	// Filesystem
	// -------------------------------------------------------------------------

	async readFile(params: FsReadFileParams): Promise<string> {
		this.validateFsParams(params, ['filePath']);
		const manager = this.buildFileManager();
		return manager.readFile(params.filePath, { encoding: params.encoding });
	}

	async readFileBinary(filePath: string): Promise<string> {
		this.validateFsParams({ filePath }, ['filePath']);
		const manager = this.buildFileManager();
		const buffer = await manager.readFileBinary(filePath);
		return buffer.toString('base64');
	}

	async writeFile(params: FsWriteFileParams): Promise<void> {
		this.validateFsParams(params, ['filePath', 'content']);
		if (typeof params.content !== 'string') {
			throw new Error('fs:write-file: content must be a string');
		}
		const manager = this.buildFileManager();
		await manager.writeFile(params.filePath, params.content, {
			encoding: params.encoding,
			atomic: params.atomic,
			createParents: params.createParents,
		});
	}

	async createFolder(params: FsCreateFolderParams): Promise<void> {
		this.validateFsParams(params, ['folderPath']);
		const manager = this.buildFileManager();
		await manager.createFolder(params.folderPath, {
			recursive: params.recursive,
			failIfExists: params.failIfExists,
		});
	}

	async deleteFolder(params: FsDeleteFolderParams): Promise<void> {
		this.validateFsParams(params, ['folderPath']);
		const manager = this.buildFileManager();
		await manager.deleteFolder(params.folderPath, {
			recursive: params.recursive,
		});
	}

	async deleteFile(params: FsDeleteFileParams): Promise<void> {
		this.validateFsParams(params, ['filePath']);
		const manager = this.buildFileManager();
		await manager.deleteFile(params.filePath);
	}

	async rename(params: FsRenameParams): Promise<FsRenameResult> {
		this.validateFsParams(params, ['oldPath', 'newPath']);
		const manager = this.buildFileManager();
		return manager.renameEntry(params.oldPath, params.newPath, {
			failIfExists: params.failIfExists,
		});
	}

	async listDir(params: FsListDirParams): Promise<FsListDirEntry[]> {
		this.validateFsParams(params, ['dirPath']);
		const manager = this.buildFileManager();
		return manager.listDir(params.dirPath);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Ensure the documents/ and resources/ sub-folders exist.
	 * Called when a workspace is opened or set.
	 */
	private async ensureWorkspaceSubfolders(workspacePath: string): Promise<void> {
		await fsPromises.mkdir(path.join(workspacePath, 'documents'), { recursive: true });
		await fsPromises.mkdir(path.join(workspacePath, 'resources'), { recursive: true });
		this.logger.info('Workspace', `Ensured workspace sub-folders at: ${workspacePath}`);
	}

	private requireWorkspace(): string {
		const current = this.workspace.getCurrent();
		if (!current) {
			throw new Error('No workspace selected. Please select a workspace first.');
		}
		return current;
	}

	private isValidOutputType(type: string): type is OutputType {
		return (VALID_OUTPUT_TYPES as readonly string[]).includes(type);
	}

	private validateOutputType(type: string): void {
		if (!type || typeof type !== 'string') {
			throw new Error('Invalid type: must be a non-empty string');
		}
		if (!this.isValidOutputType(type)) {
			throw new Error(
				`Invalid output type "${type}". Must be one of: ${VALID_OUTPUT_TYPES.join(', ')}`
			);
		}
	}

	private validateOutputTypeAndId(params: { type: string; id: string }): void {
		this.validateOutputType(params.type);
		if (!params.id || typeof params.id !== 'string') {
			throw new Error('Invalid id: must be a non-empty string');
		}
	}

	private validateOutputInput(input: SaveOutputFileInput): void {
		this.validateOutputType(input.type);
		if (typeof input.content !== 'string') {
			throw new Error('Invalid content: must be a string');
		}
		if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
			throw new Error('Invalid metadata: must be an object');
		}
	}

	private buildFileManager(): FileManager {
		const extraRoots: string[] = [];
		const workspacePath = this.workspace.getCurrent();
		if (workspacePath) {
			extraRoots.push(workspacePath);
		}
		return new FileManager(this.logger, extraRoots);
	}

	private validateFsParams(params: unknown, required: string[]): void {
		if (params === null || typeof params !== 'object' || Array.isArray(params)) {
			throw new Error('Invalid payload: expected a plain object');
		}
		const record = params as Record<string, unknown>;
		for (const key of required) {
			const value = record[key];
			if (typeof value !== 'string' || value.trim().length === 0) {
				throw new Error(`Invalid payload: "${key}" must be a non-empty string`);
			}
		}
	}
}
