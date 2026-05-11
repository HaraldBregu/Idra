import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';

import type { WorkspaceService } from '../../workspace';
import { Tool } from './base.js';

const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_LIMIT = 200;

interface WorkspaceEntry {
	name: string;
	path: string;
	type: 'directory' | 'file' | 'other';
}

function numberArg(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return fallback;
	}
	return Math.floor(value);
}

function entryType(entry: Dirent): WorkspaceEntry['type'] {
	if (entry.isDirectory()) return 'directory';
	if (entry.isFile()) return 'file';
	return 'other';
}

export class GetWorkspaceContentTool extends Tool {
	name = 'get_workspace_content';
	description = 'Get files and folders under the workspace.';
	parameters = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Optional path inside the workspace to list. Defaults to workspace root.',
			},
			maxDepth: {
				type: 'number',
				description: `Maximum folder depth to include. Defaults to ${DEFAULT_MAX_DEPTH}.`,
			},
			limit: {
				type: 'number',
				description: `Maximum number of entries to return. Defaults to ${DEFAULT_LIMIT}.`,
			},
		},
		additionalProperties: false,
	};

	constructor(private readonly workspace: WorkspaceService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const relativePath = typeof args.path === 'string' ? args.path.trim() : '';
		const maxDepth = numberArg(args.maxDepth, DEFAULT_MAX_DEPTH);
		const limit = numberArg(args.limit, DEFAULT_LIMIT);
		const rootPath = this.workspace.resolvePath(relativePath);

		try {
			await this.workspace.ensureReady();
			const stat = await fs.stat(rootPath);
			if (!stat.isDirectory()) {
				return `Error: workspace path is not a directory: ${relativePath || '.'}`;
			}

			const entries: WorkspaceEntry[] = [];
			await this.collectEntries(rootPath, relativePath, maxDepth, limit, entries);

			return JSON.stringify(
				{
					rootPath: this.workspace.getRootPath(),
					path: relativePath || '.',
					entries,
					truncated: entries.length >= limit,
				},
				null,
				2
			);
		} catch (error) {
			return `Error reading workspace content: ${(error as Error).message}`;
		}
	}

	private async collectEntries(
		absoluteDirectory: string,
		relativeDirectory: string,
		depth: number,
		limit: number,
		entries: WorkspaceEntry[]
	): Promise<void> {
		if (entries.length >= limit) return;

		const dirents = await fs.readdir(absoluteDirectory, { withFileTypes: true });
		for (const dirent of dirents) {
			if (entries.length >= limit) return;

			const relativeEntryPath = path.join(relativeDirectory, dirent.name);
			entries.push({
				name: dirent.name,
				path: relativeEntryPath,
				type: entryType(dirent),
			});

			if (depth > 0 && dirent.isDirectory()) {
				await this.collectEntries(
					path.join(absoluteDirectory, dirent.name),
					relativeEntryPath,
					depth - 1,
					limit,
					entries
				);
			}
		}
	}
}

export class GetWorkspacePathTool extends Tool {
	name = 'get_workspace_path';
	description = 'Get the absolute path of the workspace.';
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(private readonly workspace: WorkspaceService) {
		super();
	}

	async execute(): Promise<string> {
		return this.workspace.getRootPath();
	}
}
