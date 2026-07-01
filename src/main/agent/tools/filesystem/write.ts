import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool, type Context } from '../../core/types';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

export class WriteTool extends BaseTool {
	readonly name = 'write';
	readonly description =
		'Create or overwrite a UTF-8 text file with exact content, creating parent directories when needed.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Absolute file path to write. ~ expands to the user home.',
			},
			content: {
				type: 'string',
				description: 'UTF-8 text content to write.',
			},
		},
		required: ['path', 'content'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const filePath = input.path;
		const content = input.content;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('write requires a non-empty path.');
		}
		if (typeof content !== 'string') {
			throw new Error('write requires string content.');
		}
		const resolved = resolvePath(filePath);
		await fs.mkdir(path.dirname(resolved), { recursive: true });
		await fs.writeFile(resolved, content, 'utf8');
		this.context.setPath(resolved);
		return { path: resolved };
	}
}
