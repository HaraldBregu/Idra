import { z } from 'zod';
import { tool } from './tool';
import { listSkills, loadSkill } from '../skills';
import { getToolContext } from './context';

export const selectSkillTool = tool({
	name: 'select_skill',
	description:
		'Select an Agent Skill as the active skill. Its full instructions are added to the system prompt for the rest of the run. Pass an empty name to clear the selection.',
	inputSchema: z.object({
		name: z
			.string()
			.describe('The skill name (or id) to select. An empty string clears the selection.'),
	}),
	execute: async ({ name }) => {
		const context = getToolContext();
		if (!name.trim()) {
			context.selectedSkill = undefined;
			return { selected: null };
		}
		const skill = await loadSkill(name);
		if (!skill) {
			return {
				error: `Skill '${name}' not found.`,
				available: listSkills().map((entry) => entry.title),
			};
		}
		context.selectedSkill = skill;
		return { selected: skill.name, skillDirectory: skill.directory };
	},
});
