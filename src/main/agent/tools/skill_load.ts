import { z } from 'zod';
import { tool } from './tool';
import { listSkills, loadSkill } from '../skills';
import { getLoopContext } from '../run/run_common';

export const loadSkillTool = tool({
	name: 'load_skill',
	description:
		'Load an Agent Skill by name and select it as the active skill. Its full instructions are added to the system prompt for the rest of the run. Returns the SKILL.md body and the skill directory path; prepend that path when reading bundled scripts, references, or assets. Pass an empty name to clear the selection.',
	inputSchema: z.object({
		name: z
			.string()
			.describe('The skill name (or id) to load. An empty string clears the selection.'),
	}),
	execute: async ({ name }) => {
		const context = getLoopContext();
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
		return { selected: skill.name, skillDirectory: skill.directory, content: skill.content };
	},
});
