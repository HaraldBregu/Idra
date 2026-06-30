import { BaseTool } from '../../core/tool';
import type { Context } from '../../core/tool';
import type { Skills } from '../../skills/skills';

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

	private readonly skills: Skills;

	constructor(context: Context, skills: Skills) {
		super(context);
		this.skills = skills;
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		const name = input.name;
		if (typeof name !== 'string' || !name.trim()) {
			throw new Error('load_skill requires a non-empty name.');
		}
		const skill = await this.skills.loadSkill(name);
		if (!skill) {
			return {
				error: `Skill '${name}' not found.`,
				available: this.skills.listSkills().map((entry) => entry.title),
			};
		}
		const skillPath = `${skill.directory}/SKILL.md`;
		this.context.setPath(skillPath);
		return { skillDirectory: skill.directory, content: skill.content };
	}
}
