import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

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

function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}
