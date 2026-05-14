import type { AgentTool } from './types';
import { textResult } from './types';

interface AskHumanArgs {
	question: string;
	suggestions?: string[];
}

/**
 * Elicitation tool. The model calls this whenever it is uncertain about a
 * parameter (file path, name, destination). The host's elicitation stream
 * collects the user's answer and feeds it back as the tool output.
 */
export const askHumanTool: AgentTool<AskHumanArgs> = {
	name: 'ask_human',
	description:
		'Ask the human for input when a required value is ambiguous or unspecified (file path, destination, name, choice). Prefer this over guessing.',
	schema: {
		type: 'object',
		properties: {
			question: { type: 'string', description: 'The question to show the human.' },
			suggestions: {
				type: 'array',
				items: { type: 'string' },
				description: 'Optional candidate answers (e.g. plausible file paths).',
			},
		},
		required: ['question'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const question = String(args.question ?? '').trim();
		if (!question) return textResult('ask_human: question required', true);
		if (!ctx.elicit) {
			return textResult('ask_human: no elicitation stream configured', true);
		}
		const suggestions = Array.isArray(args.suggestions)
			? args.suggestions.filter((s): s is string => typeof s === 'string')
			: undefined;
		try {
			const answer = await ctx.elicit.ask(question, suggestions);
			return textResult(answer);
		} catch (err) {
			return textResult(`ask_human: ${(err as Error).message}`, true);
		}
	},
};
