import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { jsonText } from '../shared/json-text';

export const skillLoadTool: AgentTool<{ name: string }> = {
	name: 'skill_load',
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
		if (!skills) return textResult('skill_load: SkillsService is unavailable.', true);
		try {
			return jsonText(await skills.load(args.name));
		} catch (error) {
			return textResult(`skill_load: ${(error as Error).message}`, true);
		}
	},
};
