import fs from 'node:fs/promises';
import { BaseTool } from '../../core/tool';
import type { Context } from '../../core/tool';
import { SkillsService } from '../../../skills';

function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? content.slice(match[0].length).trim() : content.trim();
}

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

	private readonly skills: SkillsService;

	constructor(context: Context) {
		super(context);
		this.skills = new SkillsService();
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		const name = input.name;
		if (typeof name !== 'string' || !name.trim()) {
			throw new Error('load_skill requires a non-empty name.');
		}
		const wanted = name.trim().toLowerCase();
		const available = this.skills.list().filter((skill) => skill.manifest.enabled !== false);
		const skill = available.find(
			(entry) => entry.name.toLowerCase() === wanted || entry.id.toLowerCase() === wanted,
		);
		if (!skill || !skill.skillPath) {
			return {
				error: `Skill '${name}' not found.`,
				available: available.map((entry) => entry.name),
			};
		}
		const content = await fs.readFile(skill.skillPath, 'utf8');
		this.context.setPath(skill.skillPath);
		return { skillDirectory: skill.folderPath, content: stripFrontmatter(content) };
	}
}
