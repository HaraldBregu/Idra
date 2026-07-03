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

export const readTool = tool({
	name: 'read',
	description:
		'Read the full UTF-8 contents of a single text file. Use this before editing when you need the current file contents.',
	inputSchema: z.object({
		path: z
			.string()
			.min(1)
			.describe('Absolute file path to read. ~ expands to the user home.'),
	}),
	execute: async ({ path: filePath }) => {
		const resolved = resolvePath(filePath);
		return fs.readFile(resolved, 'utf8');
	},
});
