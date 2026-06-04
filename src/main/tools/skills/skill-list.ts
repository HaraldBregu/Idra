import type { AgentTool } from '../core/tool';
import { textResult } from '../core/tool';
import { jsonText } from '../core/shared/json-text';

export const skillListTool: AgentTool = {
	name: 'skill_list',
	description: 'List installed skills available to the agent.',
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		const skills = ctx.services.skills;
		if (!skills) return textResult('skill_list: SkillsService is unavailable.', true);
		try {
			return jsonText(await skills.list());
		} catch (error) {
			return textResult(`skill_list: ${(error as Error).message}`, true);
		}
	},
};
