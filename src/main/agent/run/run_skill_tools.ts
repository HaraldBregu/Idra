import type { Tool } from '../types';

export function selectSkillTools(tools: Tool[], allowedTools: string[] | undefined): Tool[] {
	if (!allowedTools) return tools;
	const allowed = new Set(allowedTools);
	return tools.filter(
		(tool) =>
			tool.name === 'load_skill' ||
			(tool.name !== 'subagent' && tool.name !== 'subagents' && allowed.has(tool.name))
	);
}
