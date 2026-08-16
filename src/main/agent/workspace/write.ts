import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { atomicWrite } from '../../shared/atomic_write';
import { tool } from '../core/tool';
import type { Tool } from '../types';
import { workspaceFilePath } from './path';

export function createWorkspaceWriteTool(rootPath: string): Tool {
	return tool({
		id: 'write_file',
		name: 'Write file',
		description: 'Create or overwrite a UTF-8 text file inside the workspace.',
		inputSchema: z.object({
			path: z.string().min(1).describe('Path relative to the workspace root.'),
			content: z.string().describe('UTF-8 text content to write.'),
		}),
		execute: async ({ path: filePath, content }) => {
			const resolved = workspaceFilePath(rootPath, filePath);
			await fs.mkdir(path.dirname(resolved), { recursive: true });
			const verified = workspaceFilePath(rootPath, filePath);
			await atomicWrite(verified, content);
			return { path: verified };
		},
	});
}
