import type { RuntimeInput, RuntimePrompt } from '../types';

export function composePrompt(input: RuntimeInput): RuntimePrompt {
	const system = input.system ?? 'You are Friday. Complete the task directly.';
	const tools = input.tools ?? [];
	const toolPrompt = tools.length
		? [
				'Available tools:',
				...tools.map((tool) => `- ${tool.name}${tool.description ? `: ${tool.description}` : ''}`),
				'When a tool is needed, output tool calls as JSON: {"toolCalls":[{"name":"tool","args":{}}]}',
			].join('\n')
		: '';
	const messages = [...(input.messages ?? []), { role: 'user' as const, content: input.message }];
	const transcript = messages
		.map((message) => `${message.role}: ${message.content}`)
		.join('\n');

	return {
		system,
		prompt: [toolPrompt, transcript].filter(Boolean).join('\n\n'),
		messages,
	};
}
