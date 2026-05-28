import type { AgentTool } from './types';
export function toToolDefinitions(tools: AgentTool[]) {
	return tools.map((tool) => ({ name: tool.name, description: tool.description, schema: tool.schema }));
}
