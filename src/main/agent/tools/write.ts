import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';
import type { Workspace } from '../core/workspace';

export class WriteTool extends Tool {
	readonly name = 'write_file';
	readonly description = 'Write UTF-8 text content to a workspace file by relative path.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Relative path inside the workspace.',
			},
			content: {
				type: 'string',
				description: 'UTF-8 text content to write.',
			},
		},
		required: ['path', 'content'],
		additionalProperties: false,
	};

	constructor(private readonly workspace: Workspace) {
		super();
	}

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const filePath = input.path;
		const content = input.content;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('write_file requires a non-empty path.');
		}
		if (typeof content !== 'string') {
			throw new Error('write_file requires string content.');
		}
		if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
			throw new Error(`Tool file path must be relative: ${filePath}`);
		}
		const workspacePath = this.workspace.getPath();
		const workspaceFilePath = path.resolve(workspacePath, filePath);
		const relativePath = path.relative(workspacePath, workspaceFilePath);
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Tool file path resolves outside workspace: ${filePath}`);
		}
		await fs.mkdir(path.dirname(workspaceFilePath), { recursive: true });
		await fs.writeFile(workspaceFilePath, content, 'utf8');
		return { path: filePath };
	}
}
