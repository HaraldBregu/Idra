import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { jsonText } from './shared/skills-json-text';

export const loadSkillTool: AgentTool<{ name: string }> = {
	name: 'load_skill',
	description: 'Load instructions and support file metadata for an installed skill.',
	schema: {
		type: 'object',
		properties: {
			name: { type: 'string' },
		},
		required: ['name'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const skills = ctx.services.skills;
		if (!skills) return textResult('load_skill: SkillsService is unavailable.', true);
		try {
			return jsonText(await skills.load(args.name));
		} catch (error) {
			return textResult(`load_skill: ${(error as Error).message}`, true);
		}
	},
};
