import type { Tool } from '../types';
import { currentToolName } from '../tools/aliases';

export function selectSkillTools(tools: Tool[], allowedTools: string[] | undefined): Tool[] {
	if (!allowedTools) return tools;
	const allowed = new Set(allowedTools.map(currentToolName));
	return tools.filter(
		(tool) =>
			tool.id === 'load_skill' ||
			(tool.id !== 'subagent' && tool.id !== 'subagents' && allowed.has(tool.id))
	);
}
