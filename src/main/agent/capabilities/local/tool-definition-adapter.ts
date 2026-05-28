import type { AgentTool } from './types';

export function providerSafeToolName(name: string): string {
	const normalized = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
	const safe = normalized || 'tool';
	return /^[a-z_]/.test(safe) ? safe.slice(0, 64) : `tool_${safe}`.slice(0, 64);
}

export function toToolDefinitions(tools: AgentTool[]) {
	return tools.map((tool) => ({ name: providerSafeToolName(tool.name), description: tool.description, schema: tool.schema }));
}
