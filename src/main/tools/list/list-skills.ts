import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { toolDescription } from '../base/metadata';
import { jsonText } from './skills-json-text';

export const listSkillsTool: AgentTool = {
	name: 'list_skills',
	description: toolDescription('list_skills'),
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		const skills = ctx.services.skills;
		if (!skills) return textResult('list_skills: SkillsService is unavailable.', true);
		try {
			return jsonText(await skills.list());
		} catch (error) {
			return textResult(`list_skills: ${(error as Error).message}`, true);
		}
	},
};
