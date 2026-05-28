import type { AgentHarnessPermissions, AgentHarnessTool, AgentHarnessToolRegistry } from './types';

export class DefaultAgentHarnessToolRegistry implements AgentHarnessToolRegistry {
	private readonly tools = new Map<string, AgentHarnessTool>();
	constructor(tools: AgentHarnessTool[] = []) { tools.forEach((tool) => this.register(tool)); }
	register(tool: AgentHarnessTool): void { this.tools.set(tool.name, tool); }
	unregister(name: string): void { this.tools.delete(name); }
	get(name: string): AgentHarnessTool | undefined { return this.tools.get(name); }
	list(input: { groups?: string[]; allow?: string[]; deny?: string[]; includeDisabled?: boolean } = {}): AgentHarnessTool[] {
		const allow = input.allow ? new Set(input.allow) : undefined;
		const deny = new Set(input.deny ?? []);
		const groups = input.groups ? new Set(input.groups) : undefined;
		return [...this.tools.values()].filter((tool) => (input.includeDisabled || tool.enabled !== false) && (!allow || allow.has(tool.name)) && !deny.has(tool.name) && (!groups || (tool.group && groups.has(tool.group))));
	}
}

export function filterToolsByPermissions(tools: AgentHarnessTool[], input: { permissions?: AgentHarnessPermissions; enabledTools?: string[]; disabledTools?: string[]; toolGroups?: string[] }): AgentHarnessTool[] {
	const allow = input.enabledTools ?? input.permissions?.allowTools;
	const deny = new Set([...(input.disabledTools ?? []), ...(input.permissions?.denyTools ?? [])]);
	const allowSet = allow ? new Set(allow) : undefined;
	const groups = input.toolGroups ? new Set(input.toolGroups) : undefined;
	return tools.filter((tool) => tool.enabled !== false && (!allowSet || allowSet.has(tool.name)) && !deny.has(tool.name) && (!groups || (tool.group && groups.has(tool.group))));
}

export function requiresPolicyApproval(tool: AgentHarnessTool, permissions: AgentHarnessPermissions | undefined): boolean {
	if (tool.destructive && permissions?.requireApprovalForDestructiveTools !== false) return true;
	if (tool.externalWrite && permissions?.requireApprovalForExternalWrites !== false) return true;
	return false;
}
