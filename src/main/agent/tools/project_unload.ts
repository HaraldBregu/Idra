import { z } from 'zod';
import { tool } from './tool';
import { unloadProject } from '../projects';

export const unloadProjectTool = tool({
	name: 'unload_project',
	description:
		'Unload the active project so its instructions are no longer part of the system prompt.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => {
		const unloaded = unloadProject();
		return unloaded ? { unloaded } : { error: 'No project is selected.' };
	},
});
