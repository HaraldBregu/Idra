import { z } from 'zod';
import { tool } from './tool';
import { createProject } from '../projects';

export const createProjectTool = tool({
	name: 'create_project',
	description:
		'Create a new project: makes a folder with that name under the agent projects root containing an AGENTS.md instructions file and a project.json metadata file (title, description).',
	defaultPermission: 'allow',
	inputSchema: z.object({
		name: z.string().describe('Folder-safe project name, e.g. "demo-project".'),
		description: z.string().describe('Short description of the project.'),
		instructions: z
			.string()
			.optional()
			.describe(
				'Markdown instructions written to AGENTS.md. Defaults to a stub with the name and description.'
			),
	}),
	execute: async ({ name, description, instructions }) => {
		try {
			const project = createProject(name, description, instructions);
			return {
				project: project.id,
				title: project.title,
				description: project.description,
				folder: project.folderPath,
			};
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	},
});
