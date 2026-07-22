import { z } from 'zod';
import { tool } from './tool';
import { deleteProject, list, projectContents } from '../projects';

export const deleteProjectTool = tool({
	name: 'delete_project',
	description:
		'Delete a project: removes its folder (including AGENTS.md and metadata) and unselects it if it was the active project.',
	alwaysAsk: true,
	stopOnReject: true,
	confirmDetail: (args) => (typeof args.name === 'string' ? projectContents(args.name) : undefined),
	inputSchema: z.object({
		name: z.string().describe('The project name (or title) to delete.'),
	}),
	execute: async ({ name }) => {
		const result = deleteProject(name);
		if (!result) {
			return {
				error: `Project '${name}' not found.`,
				available: list().map((project) => project.id),
			};
		}
		return result;
	},
});
