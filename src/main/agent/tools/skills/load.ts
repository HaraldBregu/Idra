import { BaseTool, type Context } from '../../types';
import { listSkills, loadSkill } from '../../skills';
  
export class LoadSkillTool extends BaseTool {
	readonly name = 'load_skill';
	readonly description =
		'Load an Agent Skill by name to read its full instructions. Returns the SKILL.md body and the skill directory path; prepend that path when reading bundled scripts, references, or assets.';
	readonly schema = {
		type: 'object',
		properties: {
			name: {
				type: 'string',
				description: 'The skill name (or id) to load.',
			},
		},
		required: ['name'],
		additionalProperties: false,
	};

	constructor(context: Context) {
		super(context);
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		const name = input.name;
		if (typeof name !== 'string' || !name.trim()) {
			throw new Error('load_skill requires a non-empty name.');
		}
		const skill = await loadSkill(name);
		if (!skill) {
			return {
				error: `Skill '${name}' not found.`,
				available: listSkills().map((entry) => entry.title),
			};
		}
		const skillPath = `${skill.directory}/SKILL.md`;
		this.context.setPath(skillPath);
		return { skillDirectory: skill.directory, content: skill.content };
	}
}
