import { z } from 'zod';
import { tool } from './tool';
import { findProject, list, readInstructions } from '../projects';

export const selectProjectTool = tool({
	name: 'select_project',
	description:
		'Select a project as the active project for this session. Its AGENTS.md instructions are returned now and added to the system prompt on following turns; follow them until the project is unloaded or the session ends.',
	defaultPermission: 'allow',
	inputSchema: z.object({
		name: z.string().describe('The project name (or title) to select.'),
	}),
	execute: async ({ name }) => {
		const project = findProject(name);
		if (!project) {
			return {
				error: `Project '${name}' not found.`,
				available: list().map((entry) => entry.id),
			};
		}
		return { project: project.id, title: project.title, instructions: readInstructions(project) };
	},
});
