import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';
import { jsonText } from './skills-json-text';

export const useSkillTool: AgentTool<{ name?: string; query?: string }> = {
	name: 'use_skill',
	description: toolDescription('use_skill'),
	schema: {
		type: 'object',
		properties: {
			name: { type: 'string' },
			query: { type: 'string' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const skills = ctx.services.skills;
		if (!skills) return textResult('use_skill: SkillsService is unavailable.', true);
		try {
			if (args.name) return jsonText(await skills.load(args.name));
			if (!args.query?.trim()) return textResult('use_skill: name or query is required.', true);
			const [match] = await skills.search(args.query, { limit: 1 });
			if (!match) return textResult('use_skill: no matching skill found.', true);
			return jsonText({ match, skill: await skills.load(match.name) });
		} catch (error) {
			return textResult(`use_skill: ${(error as Error).message}`, true);
		}
	},
};
