import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool, type Context } from '../../core/types';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

export class EditTool extends BaseTool {
	readonly name = 'edit';
	readonly description =
		'Edit a UTF-8 text file by replacing one exact text match. Use this for focused changes when the old text appears exactly once.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'Absolute file path to edit. ~ expands to the user home.',
			},
			oldText: {
				type: 'string',
				description: 'Exact text to replace.',
			},
			newText: {
				type: 'string',
				description: 'Replacement text.',
			},
		},
		required: ['path', 'oldText', 'newText'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<{ path: string }> {
		const filePath = input.path;
		const oldText = input.oldText;
		const newText = input.newText;
		if (typeof filePath !== 'string' || !filePath.trim()) {
			throw new Error('edit requires a non-empty path.');
		}
		if (typeof oldText !== 'string' || oldText.length === 0) {
			throw new Error('edit requires non-empty oldText.');
		}
		if (typeof newText !== 'string') {
			throw new Error('edit requires string newText.');
		}

		const resolved = resolvePath(filePath);
		const content = await fs.readFile(resolved, 'utf8');
		const firstIndex = content.indexOf(oldText);
		if (firstIndex === -1) {
			throw new Error('edit oldText was not found.');
		}
		if (content.indexOf(oldText, firstIndex + oldText.length) !== -1) {
			throw new Error('edit oldText matched multiple locations.');
		}

		await fs.writeFile(resolved, content.replace(oldText, newText), 'utf8');
		this.context.setPath(resolved);
		return { path: resolved };
	}
}
