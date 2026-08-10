import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { agentLocation } from '../../../shared/agent_location';
import { BOOTSTRAP_FILE } from '../../system/system_types';
import { tool } from '../tool';

export const completeBootstrapTool = tool({
	id: 'complete_bootstrap',
	name: 'complete_bootstrap',
	description:
		'Complete the one-time bootstrap by deleting BOOTSTRAP.md from the workspace. Call this only after IDENTITY.md, USER.md, and SOUL.md have been updated.',
	inputSchema: z.object({}),
	execute: async () => {
		const bootstrapPath = path.join(path.resolve(agentLocation()), BOOTSTRAP_FILE);
		await fs.rm(bootstrapPath, { force: true });
		return { completed: true };
	},
});
