import fs from 'node:fs/promises';
import { Tool } from '../core/tool';
import { resolveToolPath } from './resolve';

export class ReadTool extends Tool {
	readonly name = 'read';
	readonly description = 'Read a UTF-8 text file by path.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'File path to read.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	};

	constructor(private readonly basePath = process.cwd()) {
		super();
	}

	run(input: Record<string, unknown>): Promise<string> {
		const filePath = input.path;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('read-file requires a non-empty path.');
		}
		return fs.readFile(resolveToolPath(this.basePath, filePath), 'utf8');
	}
}
