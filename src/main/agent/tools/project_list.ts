import { z } from 'zod';
import { tool } from './tool';
import { list } from '../projects';

export const listProjectsTool = tool({
	name: 'list_projects',
	description: 'List all projects with their name, title, and description.',
	defaultPermission: 'allow',
	inputSchema: z.object({}),
	execute: async () => ({
		projects: list().map(({ id, title, description }) => ({ name: id, title, description })),
	}),
});
