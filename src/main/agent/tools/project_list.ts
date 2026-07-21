import { z } from 'zod';
import { tool } from './tool';
import { list, selectedProject } from '../projects';

export const listProjectsTool = tool({
	name: 'list_projects',
	description: 'List all projects with their name, title, description, and which one is selected.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => ({
		selected: selectedProject()?.project.id ?? null,
		projects: list().map(({ id, title, description }) => ({ name: id, title, description })),
	}),
});
