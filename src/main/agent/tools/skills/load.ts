import { z } from 'zod';
import { tool } from '../../tool';
import { listSkills, loadSkill } from '../../skills';
import type { Context, Tool } from '../../types';

export function loadSkillTool(context: Context): Tool {
	return tool({
		name: 'load_skill',
		description:
			'Load an Agent Skill by name to read its full instructions. Returns the SKILL.md body and the skill directory path; prepend that path when reading bundled scripts, references, or assets.',
		inputSchema: z.object({
			name: z.string().min(1).describe('The skill name (or id) to load.'),
		}),
		execute: async ({ name }) => {
			const skill = await loadSkill(name);
			if (!skill) {
				return {
					error: `Skill '${name}' not found.`,
					available: listSkills().map((entry) => entry.title),
				};
			}
			const skillPath = `${skill.directory}/SKILL.md`;
			context.setPath(skillPath);
			return { skillDirectory: skill.directory, content: skill.content };
		},
	});
}
