import type { AgentOrigin } from '../../../shared/agent_types';
import type { Tool } from '../types';

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
				? tools.filter((tool) => tool.allowedOrigins?.includes('bot'))
				: origin === 'subagent'
					? tools.filter((tool) => tool.name !== 'subagent' && tool.name !== 'subagents')
					: [];
	const allowed = allow && (origin !== 'task' || allow.length > 0) ? new Set(allow) : undefined;
	const denied = new Set(deny);
	return profile.filter(
		(tool) =>
			(!tool.allowedOrigins || tool.allowedOrigins.includes(origin)) &&
			(!allowed || allowed.has(tool.name)) &&
			!denied.has(tool.name)
	);
}
