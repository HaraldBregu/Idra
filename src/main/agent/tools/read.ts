import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';

export class ReadTool extends Tool {
	readonly name = 'read_file';
	readonly description = 'Read a UTF-8 text file from the workspace by relative path.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Relative path inside the workspace.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	};

	constructor(private readonly workspacePath: string) {
		super();
	}

	run(input: Record<string, unknown>): Promise<string> {
		const filePath = input.path;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('read_file requires a non-empty path.');
		}
		if (path.isAbsolute(filePath) || path.win32.isAbsolute(filePath)) {
			throw new Error(`Tool file path must be relative: ${filePath}`);
		}
		const workspaceFilePath = path.resolve(this.workspacePath, filePath);
		const relativePath = path.relative(this.workspacePath, workspaceFilePath);
		if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
			throw new Error(`Tool file path resolves outside workspace: ${filePath}`);
		}
		return fs.readFile(workspaceFilePath, 'utf8');
	}
}
