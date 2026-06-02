import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { jsonText } from './json-text';

export const loadSkillTool: AgentTool<{ name: string }> = {
	name: 'load_skill',
	description: toolDescription('load_skill'),
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
