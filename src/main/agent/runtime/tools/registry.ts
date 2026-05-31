import type { PermissionContext } from '../permissions/PermissionContext';
import type { Tool } from './Tool';

export class ToolRegistry {
	private readonly tools = new Map<string, Tool<unknown, unknown>>();

	constructor(tools: Tool<unknown, unknown>[] = []) {
		for (const tool of tools) this.register(tool);
	}

	register(tool: Tool<unknown, unknown>): void {
		if (!tool.name.trim()) throw new Error('Tool name is required.');
		this.tools.set(tool.name, tool);
	}

	list(context?: PermissionContext): Tool<unknown, unknown>[] {
		const denied = new Set(context?.alwaysDenyRules.map((rule) => rule.toolName).filter(Boolean));
		return [...this.tools.values()].filter((tool) => !denied.has(tool.name));
	}

	get(name: string): Tool<unknown, unknown> | undefined {
		return this.tools.get(name);
	}
}

export function assembleToolPool(
	permissionContext: PermissionContext,
	baseTools: Tool<unknown, unknown>[],
	connectorTools: Tool<unknown, unknown>[] = []
): Tool<unknown, unknown>[] {
	const registry = new ToolRegistry([...baseTools, ...connectorTools]);
	return registry.list(permissionContext);
}
