import { z } from 'zod';
import { tool } from '../tool';
import { listSkills, loadSkill } from '../../skills';

export const loadSkillTool = tool({
	name: 'load_skill',
	description:
		'Load an Agent Skill by name to get its full instructions. Returns the SKILL.md body and the skill directory path; prepend that path when reading bundled scripts, references, or assets.',
	inputSchema: z.object({
		name: z.string().describe('The skill name (or id) to load.'),
	}),
	execute: async ({ name }) => {
		const skill = await loadSkill(name);
		if (!skill) {
			return {
				error: `Skill '${name}' not found.`,
				available: listSkills().map((entry) => entry.title),
			};
		}
		return {
			skill: skill.name,
			skillDirectory: skill.directory,
			content: skill.content,
			source: skill.source,
			trust: skill.trust,
			hash: skill.hash,
			allowedTools: skill.allowedTools,
		};
	},
});
