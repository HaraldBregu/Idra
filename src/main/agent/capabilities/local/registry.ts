import { filesystemDeleteTools, filesystemReadTools, filesystemTools, filesystemWriteTools } from './fs';
import type { AgentTool } from './types';

export function createDefaultToolRegistry(): Map<string, AgentTool> {
	return new Map(filesystemTools.map((tool) => [tool.name, tool]));
}

export function localToolCatalogByName(): Map<string, { tool: AgentTool; group: string }> {
	return new Map([
		...filesystemReadTools.map((tool) => [tool.name, { tool, group: 'filesystem:read' }] as const),
		...filesystemWriteTools.map((tool) => [tool.name, { tool, group: 'filesystem:write' }] as const),
		...filesystemDeleteTools.map((tool) => [tool.name, { tool, group: 'filesystem:delete' }] as const),
	]);
}
