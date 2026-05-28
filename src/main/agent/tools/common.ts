import type { AgentTool } from './types';

const metadata = new WeakMap<AgentTool, Record<string, unknown>>();

export type { AgentTool, AgentToolResult, ToolContext, CronToolContext } from './types';

export function normalizeToolName(name: string): string {
	return name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'tool';
}

export function getToolMetadata(tool: AgentTool): Record<string, unknown> {
	return { ...(metadata.get(tool) ?? {}) };
}

export function setToolMetadata<T extends AgentTool>(tool: T, data: Record<string, unknown>): T {
	metadata.set(tool, { ...metadata.get(tool), ...data });
	return tool;
}

export function markCoreTool<T extends AgentTool>(tool: T): T {
	return setToolMetadata(tool, { source: 'core' });
}

export function markClientTool<T extends AgentTool>(tool: T): T {
	return setToolMetadata(tool, { source: 'client' });
}

export function createToolDiagnostics(tool: AgentTool): Record<string, unknown> {
	return { name: tool.name, metadata: getToolMetadata(tool) };
}
