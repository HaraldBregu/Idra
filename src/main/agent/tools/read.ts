import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';
import type { Workspace } from '../core/workspace';
import type { RuntimeTool } from '../types';

export class ReadTool extends Tool {
	constructor(private readonly workspace: Workspace) {
		super();
	}

	run(): RuntimeTool {
		return {
			name: 'read_file',
			description: 'Read a UTF-8 text file from the workspace by relative path.',
			schema: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'Relative path inside the workspace.',
					},
				},
				required: ['path'],
				additionalProperties: false,
			},
			run: async (input) => {
				const filePath = input.path;
				if (typeof filePath !== 'string' || !filePath.trim()) {
					throw new Error('read_file requires a non-empty path.');
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
				return fs.readFile(workspaceFilePath, 'utf8');
			},
		};
	}
}
