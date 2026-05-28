import { createCronTool } from './cron/tools';
import { listTool, readTool, writeTool } from './fs';
import { spawnSubagentTool } from './subagent/tools';
import { runShellTool } from './workspace/tools';
import type { AgentTool } from './types';

export function createDefaultToolRegistry(): Map<string, AgentTool> {
	return new Map([readTool, writeTool, listTool, runShellTool, createCronTool, spawnSubagentTool].map((tool) => [tool.name, tool]));
}

export function localToolCatalogByName(): Map<string, { tool: AgentTool; group: string }> {
	return new Map([...createDefaultToolRegistry()].map(([name, tool]) => [name, { tool, group: 'core' }]));
}
