import { z } from 'zod';
import { tool } from './tool';
import { list, selectProject } from '../projects';

export const selectProjectTool = tool({
	name: 'select_project',
	description:
		'Select a project as the active project. Its AGENTS.md instructions are returned now and added to the system prompt on following turns; follow them until the project is unloaded.',
	inputSchema: z.object({
		name: z.string().describe('The project name (or title) to select.'),
	}),
	execute: async ({ name }) => {
		const selected = selectProject(name);
		if (!selected) {
			return {
				error: `Project '${name}' not found.`,
				available: list().map((project) => project.id),
			};
		}
		return {
			project: selected.project.id,
			title: selected.project.title,
			instructions: selected.instructions,
		};
	},
});
