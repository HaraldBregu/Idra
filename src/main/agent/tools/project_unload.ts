import { z } from 'zod';
import { tool } from './tool';

export const unloadProjectTool = tool({
	name: 'unload_project',
	description:
		'Unload the active project so its instructions are no longer part of the system prompt.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => ({ unloaded: true }),
});
