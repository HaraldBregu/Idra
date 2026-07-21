import { z } from 'zod';
import { tool } from './tool';
import { getSelectedProject, list } from '../projects';

export const listProjectsTool = tool({
	name: 'list_projects',
	description: 'List all projects with their name, title, description, and which one is selected.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => ({
		selected: getSelectedProject() ?? null,
		projects: list().map(({ id, title, description }) => ({ name: id, title, description })),
	}),
});
