import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { jsonText } from './shared/skills-json-text';

export const skillUseTool: AgentTool<{ name?: string; query?: string }> = {
	name: 'skill_use',
	description: 'Select and load a skill for the current task.',
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
		if (!skills) return textResult('skill_use: SkillsService is unavailable.', true);
		try {
			if (args.name) return jsonText(await skills.load(args.name));
			if (!args.query?.trim()) return textResult('skill_use: name or query is required.', true);
			const [match] = await skills.search(args.query, { limit: 1 });
			if (!match) return textResult('skill_use: no matching skill found.', true);
			return jsonText({ match, skill: await skills.load(match.name) });
		} catch (error) {
			return textResult(`skill_use: ${(error as Error).message}`, true);
		}
	},
};
