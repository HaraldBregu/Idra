import { filesystemDeleteTools, filesystemReadTools, filesystemTools, filesystemWriteTools } from './fs';
import type { AgentTool } from './types';

export type LocalToolGroup = 'filesystem:read' | 'filesystem:write' | 'filesystem:delete';

export function createDefaultToolRegistry(): Map<string, AgentTool> {
	return new Map(filesystemTools.map((tool) => [tool.name, tool]));
}

export function localToolCatalogByName(): Map<string, { tool: AgentTool; group: LocalToolGroup }> {
	const entries: Array<[string, { tool: AgentTool; group: LocalToolGroup }]> = [
		...filesystemReadTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool, group: 'filesystem:read' }]),
		...filesystemWriteTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool, group: 'filesystem:write' }]),
		...filesystemDeleteTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool, group: 'filesystem:delete' }]),
	];
	return new Map(entries);
}
