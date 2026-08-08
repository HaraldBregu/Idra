import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { agentLocation } from '../../../shared/agent_location';
import { resolveUserPath } from '../../../shared/user_path';
import { tool } from '../tool';

export const writeTool = tool({
	name: 'write',
	risk: 'high',
	effect: 'write',
	hardApproval: ({ path: filePath }) => existsSync(resolveUserPath(filePath, agentLocation())),
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
		const resolved = resolveUserPath(filePath, agentLocation());
		await fs.mkdir(path.dirname(resolved), { recursive: true });
		await fs.writeFile(resolved, content, 'utf8');
		return { path: resolved };
	},
});
