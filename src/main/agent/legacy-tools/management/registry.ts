import type { Tool, ToolCategory } from './types';
import { ToolManagementError } from './types';

export class ToolRegistry {
	private readonly tools = new Map<string, Tool>();

	registerTool(tool: Tool): void {
		validateToolDefinition(tool);
		if (this.tools.has(tool.id)) {
			throw new ToolManagementError(`Tool already registered: ${tool.id}`, 'TOOL_ALREADY_REGISTERED', {
				toolId: tool.id,
			});
		}
		this.tools.set(tool.id, tool);
	}

	unregisterTool(toolId: string): boolean {
		return this.tools.delete(toolId);
	}

	getTool(toolId: string): Tool | undefined {
		return this.tools.get(toolId);
	}

	listTools(): Tool[] {
		return [...this.tools.values()];
	}

	searchTools(query: string): Tool[] {
		const terms = tokenize(query);
		if (terms.length === 0) return this.listTools();
		return this.listTools()
			.map((tool) => ({ tool, score: scoreToolSearch(tool, terms) }))
			.filter((entry) => entry.score > 0)
			.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
			.map((entry) => entry.tool);
	}

	listToolsByCategory(category: ToolCategory): Tool[] {
		return this.listTools().filter((tool) => tool.category === category);
	}

	enableTool(toolId: string): void {
		this.setEnabled(toolId, true);
	}

	disableTool(toolId: string): void {
		this.setEnabled(toolId, false);
	}

	private setEnabled(toolId: string, enabled: boolean): void {
		const tool = this.tools.get(toolId);
		if (!tool) throw new ToolManagementError(`Tool not found: ${toolId}`, 'TOOL_NOT_FOUND', { toolId });
		this.tools.set(toolId, { ...tool, enabled });
	}
}

export function createToolRegistry(tools: Tool[] = []): ToolRegistry {
	const registry = new ToolRegistry();
	for (const tool of tools) registry.registerTool(tool);
	return registry;
}

function validateToolDefinition(tool: Tool): void {
	const requiredStrings = ['id', 'name', 'description', 'category', 'version', 'owner'] as const;
	for (const field of requiredStrings) {
		if (!String(tool[field] ?? '').trim()) {
			throw new ToolManagementError(`Tool is missing ${field}`, 'INVALID_TOOL_DEFINITION', { field });
		}
	}
	if (!tool.inputSchema || !tool.outputSchema) {
		throw new ToolManagementError('Tool schemas are required', 'INVALID_TOOL_DEFINITION', { toolId: tool.id });
	}
	if (!Number.isFinite(tool.reliabilityScore) || tool.reliabilityScore < 0 || tool.reliabilityScore > 1) {
		throw new ToolManagementError('Tool reliabilityScore must be between 0 and 1', 'INVALID_TOOL_DEFINITION', {
			toolId: tool.id,
		});
	}
}

function scoreToolSearch(tool: Tool, terms: string[]): number {
	const haystack = [
		tool.id,
		tool.name,
		tool.description,
		tool.category,
		...tool.tags,
		tool.metadata.whenToUse,
		tool.metadata.whenNotToUse,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function tokenize(input: string): string[] {
	return input
		.toLowerCase()
		.split(/[^a-z0-9_@.-]+/i)
		.map((term) => term.trim())
		.filter((term) => term.length > 1);
}

