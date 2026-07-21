import { z } from 'zod';
import { tool } from './tool';
import { list, updateProject } from '../projects';

export const updateProjectTool = tool({
	name: 'update_project',
	description: 'Update a project title, description, and/or AGENTS.md instructions.',
	defaultPermission: 'allow',
	inputSchema: z.object({
		name: z.string().describe('The project name (or title) to update.'),
		title: z.string().optional().describe('New title for the project.'),
		description: z.string().optional().describe('New description for the project.'),
		instructions: z.string().optional().describe('Replaces the full AGENTS.md content.'),
	}),
	execute: async ({ name, title, description, instructions }) => {
		const project = updateProject(name, { title, description, instructions });
		if (!project) {
			return {
				error: `Project '${name}' not found.`,
				available: list().map((entry) => entry.id),
			};
		}
		return { project };
	},
});
