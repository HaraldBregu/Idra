import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { tool } from '../../tool';
import type { Context, Tool } from '../../types';

function resolvePath(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) return path.resolve(os.homedir(), p.slice(2));
	return path.resolve(p);
}

export function writeTool(context: Context): Tool {
	return tool({
		name: 'write',
		description:
			'Create or overwrite a UTF-8 text file with exact content, creating parent directories when needed.',
		inputSchema: z.object({
			path: z
				.string()
				.min(1)
				.describe('Absolute file path to write. ~ expands to the user home.'),
			content: z.string().describe('UTF-8 text content to write.'),
		}),
		execute: async ({ path: filePath, content }) => {
			const resolved = resolvePath(filePath);
			await fs.mkdir(path.dirname(resolved), { recursive: true });
			await fs.writeFile(resolved, content, 'utf8');
			context.setPath(resolved);
			return { path: resolved };
		},
	});
}
