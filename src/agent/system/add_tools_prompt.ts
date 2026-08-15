import type { Tool } from '../types';

export function addToolsPrompt(prompt: string, tools: Tool[]): string {
	const nativeTools = tools.filter((tool) => !tool.id.startsWith('mcp__'));
	if (nativeTools.length === 0) return prompt;

	prompt += '\n\n## Tools';
	prompt += '\nThe following built-in tools are available to you:';
	prompt += '\n\n| ID | Name | Description |';
	prompt += '\n| --- | --- | --- |';
	for (const t of nativeTools)
		prompt += `\n| \`${t.id}\` | ${t.name} | ${(t.description ?? '').replace(/\n/g, ' ')} |`;

	return prompt;
}
