import { filesystemDeleteTools, filesystemReadTools, filesystemTools, filesystemWriteTools } from './fs';
import { cronTools } from './cron';
import { todoTools } from './todo';
import type { AgentTool } from './types';
import { assistant } from '../../../../shared/agents/assistant';

export type LocalToolGroup = 'filesystem:read' | 'filesystem:write' | 'filesystem:delete' | 'todo' | 'cron';

const toolMetadata = new Map(assistant.tools.map((tool) => [tool.name, tool]));

function withAssistantMetadata(tool: AgentTool): AgentTool {
	const metadata = toolMetadata.get(tool.name);
	if (!metadata) return tool;
	return { ...tool, name: metadata.name, displayName: metadata.title, description: metadata.description };
}

function assistantTools(entries: AgentTool[]): AgentTool[] {
	const byName = new Map(entries.map((tool) => [tool.name, withAssistantMetadata(tool)]));
	return assistant.tools.map((tool) => byName.get(tool.name)).filter((tool): tool is AgentTool => Boolean(tool));
}

export function createDefaultToolRegistry(): Map<string, AgentTool> {
	return new Map(assistantTools([...filesystemTools, ...todoTools, ...cronTools]).map((tool) => [tool.name, tool]));
}

export function localToolCatalogByName(): Map<string, { tool: AgentTool; group: LocalToolGroup }> {
	const entries: Array<[string, { tool: AgentTool; group: LocalToolGroup }]> = [
		...filesystemReadTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool: withAssistantMetadata(tool), group: 'filesystem:read' }]),
		...filesystemWriteTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool: withAssistantMetadata(tool), group: 'filesystem:write' }]),
		...filesystemDeleteTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool: withAssistantMetadata(tool), group: 'filesystem:delete' }]),
		...todoTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool: withAssistantMetadata(tool), group: 'todo' }]),
		...cronTools.map((tool): [string, { tool: AgentTool; group: LocalToolGroup }] => [tool.name, { tool: withAssistantMetadata(tool), group: 'cron' }]),
	];
	return new Map(entries.filter(([name]) => toolMetadata.has(name)));
}
