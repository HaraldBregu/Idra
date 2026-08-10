import type { AgentOrigin } from '../../../shared/agent_types';
import type { Tool } from '../types';
import { currentToolName } from '../tools/aliases';

export function selectOriginTools(
	tools: Tool[],
	origin: AgentOrigin,
	allow?: readonly string[],
	deny: readonly string[] = []
): Tool[] {
	const profile =
		origin === 'main' || origin === 'task'
			? tools
			: origin === 'bot'
				? tools.filter((tool) => tool.name === 'web_search' || tool.name === 'web_fetch')
				: origin === 'subagent'
					? tools.filter((tool) => tool.name !== 'subagent' && tool.name !== 'subagents')
					: [];
	const allowed =
		allow && (origin !== 'task' || allow.length > 0)
			? new Set(allow.map(currentToolName))
			: undefined;
	const denied = new Set(deny.map(currentToolName));
	return profile.filter(
		(tool) => (!allowed || allowed.has(tool.name)) && !denied.has(tool.name)
	);
}
