import fs from 'node:fs/promises';
import { Tool } from '../core/tool';
import { resolveToolPath } from './resolve';

export class EditTool extends Tool {
	readonly name = 'edit';
	readonly description = 'Edit a UTF-8 text file by replacing exact text.';
	readonly schema = {
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'File path to edit. Relative paths resolve from the workspace; ~ expands to the user home.',
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

	constructor(private readonly basePath = process.cwd()) {
		super();
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

		const resolvedPath = resolveToolPath(this.basePath, filePath);
		const content = await fs.readFile(resolvedPath, 'utf8');
		const firstIndex = content.indexOf(oldText);
		if (firstIndex === -1) {
			throw new Error('edit oldText was not found.');
		}
		if (content.indexOf(oldText, firstIndex + oldText.length) !== -1) {
			throw new Error('edit oldText matched multiple locations.');
		}

		await fs.writeFile(resolvedPath, content.replace(oldText, newText), 'utf8');
		return { path: resolvedPath };
	}
}
