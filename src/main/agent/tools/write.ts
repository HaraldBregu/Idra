import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';
import { resolveToolPath } from './resolve';

export class WriteTool extends Tool {
	readonly name = 'write';
	readonly description = 'Write UTF-8 text content to a file by path.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'File path to write. Relative paths resolve from the workspace; ~ expands to the user home.',
			},
			content: {
				type: 'string',
				description: 'UTF-8 text content to write.',
			},
		},
		required: ['path', 'content'],
		additionalProperties: false,
	};

	constructor(private readonly basePath = process.cwd()) {
		super();
	}

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const filePath = input.path;
		const content = input.content;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('write-file requires a non-empty path.');
		}
		if (typeof content !== 'string') {
			throw new Error('write-file requires string content.');
		}
		const resolvedPath = resolveToolPath(this.basePath, filePath);
		await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
		await fs.writeFile(resolvedPath, content, 'utf8');
		return { path: resolvedPath };
	}
}
