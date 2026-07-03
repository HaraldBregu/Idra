import type { Tool } from '../types';

export function addToolsPrompt(prompt: string, tools: Tool[]): string {
	if (tools.length === 0) return prompt;

	prompt += '\n\n## Tools';
	prompt += '\nThe following tools are available to you:';
	prompt += '\n\n| Tool | Description |';
	prompt += '\n| --- | --- |';
	for (const t of tools)
		prompt += `\n| \`${t.name}\` | ${(t.description ?? '').replace(/\n/g, ' ')} |`;

	return prompt;
}
