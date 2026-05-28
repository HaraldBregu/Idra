import type { AgentRuntimePermissions, AgentRuntimeTool, AgentRuntimeToolRegistry } from './types';

export class DefaultAgentRuntimeToolRegistry implements AgentRuntimeToolRegistry {
	private readonly tools = new Map<string, AgentRuntimeTool>();
	constructor(tools: AgentRuntimeTool[] = []) { tools.forEach((tool) => this.register(tool)); }
	register(tool: AgentRuntimeTool): void { this.tools.set(tool.name, tool); }
	unregister(name: string): void { this.tools.delete(name); }
	get(name: string): AgentRuntimeTool | undefined { return this.tools.get(name); }
	list(input: { groups?: string[]; allow?: string[]; deny?: string[]; includeDisabled?: boolean } = {}): AgentRuntimeTool[] {
		const allow = input.allow ? new Set(input.allow) : undefined;
		const deny = new Set(input.deny ?? []);
		const groups = input.groups ? new Set(input.groups) : undefined;
		return [...this.tools.values()].filter((tool) => (input.includeDisabled || tool.enabled !== false) && (!allow || allow.has(tool.name)) && !deny.has(tool.name) && (!groups || (tool.group && groups.has(tool.group))));
	}
}

export function filterToolsByPermissions(tools: AgentRuntimeTool[], input: { permissions?: AgentRuntimePermissions; enabledTools?: string[]; disabledTools?: string[]; toolGroups?: string[] }): AgentRuntimeTool[] {
	const allow = input.enabledTools ?? input.permissions?.allowTools;
	const deny = new Set([...(input.disabledTools ?? []), ...(input.permissions?.denyTools ?? [])]);
	const allowSet = allow ? new Set(allow) : undefined;
	const groups = input.toolGroups ? new Set(input.toolGroups) : undefined;
	return tools.filter((tool) => tool.enabled !== false && (!allowSet || allowSet.has(tool.name)) && !deny.has(tool.name) && (!groups || (tool.group && groups.has(tool.group))));
}

export function requiresPolicyApproval(tool: AgentRuntimeTool, permissions: AgentRuntimePermissions | undefined): boolean {
	if (tool.destructive && permissions?.requireApprovalForDestructiveTools !== false) return true;
	if (tool.externalWrite && permissions?.requireApprovalForExternalWrites !== false) return true;
	return false;
}
