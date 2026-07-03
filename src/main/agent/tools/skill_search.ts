import { z } from 'zod';
import { tool } from './tool';
import { list } from '../skills';

export const searchSkillsTool = tool({
	name: 'search_skills',
	description:
		'Search the available Agent Skills by keyword. Returns matching skills with their id, name, and description. Pass an empty query to list all skills. Use select_skill to activate one.',
	inputSchema: z.object({
		query: z.string().describe('Keywords to match against skill names and descriptions.'),
	}),
	execute: async ({ query }) => {
		const wanted = query.trim().toLowerCase();
		const skills = list()
			.filter((skill) => skill.manifest.enabled !== false)
			.filter(
				(skill) =>
					!wanted ||
					skill.id.toLowerCase().includes(wanted) ||
					skill.name.toLowerCase().includes(wanted) ||
					skill.description.toLowerCase().includes(wanted),
			)
			.map((skill) => ({ id: skill.id, name: skill.name, description: skill.description }));
		return { skills };
	},
});
