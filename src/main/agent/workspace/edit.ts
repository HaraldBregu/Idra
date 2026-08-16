import fs from 'node:fs/promises';
import { z } from 'zod';
import { atomicWrite } from '../../shared/atomic_write';
import { tool } from '../core/tool';
import type { Tool } from '../types';
import { workspaceFilePath } from './path';

export function createWorkspaceEditTool(rootPath: string): Tool {
	return tool({
		id: 'edit',
		name: 'Edit',
		description: 'Replace one exact text match in a UTF-8 file inside the workspace.',
		inputSchema: z.object({
			path: z.string().min(1).describe('Path relative to the workspace root.'),
			oldText: z.string().min(1).describe('Exact text to replace.'),
			newText: z.string().describe('Replacement text.'),
		}),
		execute: async ({ path: filePath, oldText, newText }) => {
			const resolved = workspaceFilePath(rootPath, filePath);
			const content = await fs.readFile(resolved, 'utf8');
			const firstIndex = content.indexOf(oldText);
			if (firstIndex === -1) throw new Error('edit oldText was not found.');
			if (content.indexOf(oldText, firstIndex + oldText.length) !== -1) {
				throw new Error('edit oldText matched multiple locations.');
			}

			const verified = workspaceFilePath(rootPath, filePath);
			await atomicWrite(verified, content.replace(oldText, newText));
			return { path: verified };
		},
	});
}
