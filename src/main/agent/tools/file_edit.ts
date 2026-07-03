import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { tool } from './tool';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

export const editTool = tool({
	name: 'edit',
	description:
		'Edit a UTF-8 text file by replacing one exact text match. Use this for focused changes when the old text appears exactly once.',
	inputSchema: z.object({
		path: z
			.string()
			.min(1)
			.describe('Absolute file path to edit. ~ expands to the user home.'),
		oldText: z.string().min(1).describe('Exact text to replace.'),
		newText: z.string().describe('Replacement text.'),
	}),
	execute: async ({ path: filePath, oldText, newText }) => {
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
		return { path: resolved };
	},
});
