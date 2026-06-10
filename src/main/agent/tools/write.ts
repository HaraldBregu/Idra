import fs from 'node:fs/promises';
import path from 'node:path';
import { Tool } from '../core/tool';

export class WriteTool extends Tool {
	readonly name = 'write_file';
	readonly description = 'Write UTF-8 text content to a file by path.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'File path to write.',
			},
			content: {
				type: 'string',
				description: 'UTF-8 text content to write.',
			},
		},
		required: ['path', 'content'],
		additionalProperties: false,
	};

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const filePath = input.path;
		const content = input.content;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('write_file requires a non-empty path.');
		}
		if (typeof content !== 'string') {
			throw new Error('write_file requires string content.');
		}
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, 'utf8');
		return { path: filePath };
	}
}
