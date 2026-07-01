import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool, type Context } from '../../types';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

export class ReadTool extends BaseTool {
	readonly name = 'read';
	readonly description =
		'Read the full UTF-8 contents of a single text file. Use this before editing when you need the current file contents.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Absolute file path to read. ~ expands to the user home.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<string> {
		const filePath = input.path;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('read requires a non-empty path.');
		}
		const resolved = resolvePath(filePath);
		const content = await fs.readFile(resolved, 'utf8');
		this.context.setPath(resolved);
		return content;
	}
}
