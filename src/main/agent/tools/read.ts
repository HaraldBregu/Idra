import fs from 'node:fs/promises';
import { Tool, type ToolContext } from '../core/tool';
import { resolveToolPath } from './resolve';

export class ReadTool extends Tool {
	readonly name = 'read';
	readonly description =
		'Read the full UTF-8 contents of a single text file. Use this before editing when you need the current file contents.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'File path to read. Relative paths resolve from the workspace; ~ expands to the user home.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	};

	constructor(
		private readonly basePath = process.cwd(),
		context?: ToolContext
	) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<string> {
		const filePath = input.path;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('read-file requires a non-empty path.');
		}
		const resolvedPath = resolveToolPath(this.basePath, filePath);
		const content = await fs.readFile(resolvedPath, 'utf8');
		this.context.setCurrentFile(resolvedPath);
		return content;
	}
}
