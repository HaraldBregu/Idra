import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool } from '../core/tool';
import type { Context } from '../core/tool';

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
