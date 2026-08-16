import fs from 'node:fs/promises';
import { z } from 'zod';
import { tool } from '../core/tool';
import type { Tool } from '../types';
import { workspaceFilePath } from './path';

export function createWorkspaceReadTool(rootPath: string): Tool {
	return tool({
		id: 'read',
		name: 'Read',
		description: 'Read the full UTF-8 contents of a text file inside the workspace.',
		inputSchema: z.object({
			path: z.string().min(1).describe('Path relative to the workspace root.'),
		}),
		execute: async ({ path: filePath }) => {
			return fs.readFile(workspaceFilePath(rootPath, filePath), 'utf8');
		},
	});
}
