import type { AgentHarnessPermissions, AgentHarnessTool, AgentHarnessToolRegistry, AgentHarnessToolRegistryQuery } from './types';
import { AgentHarnessError } from './errors';

export class DefaultAgentHarnessToolRegistry implements AgentHarnessToolRegistry {
	private readonly tools = new Map<string, AgentHarnessTool>();

	constructor(tools: AgentHarnessTool[] = []) {
		for (const tool of tools) {
			this.register(tool);
		}
	}

	register(tool: AgentHarnessTool): void {
		if (!tool.name.trim()) {
			throw new AgentHarnessError({ code: 'config_invalid', message: 'Tool name is required.' });
		}
		this.tools.set(tool.name, tool);
	}

	unregister(name: string): void {
		this.tools.delete(name);
	}

	get(name: string): AgentHarnessTool | undefined {
		return this.tools.get(name);
	}

	list(input: AgentHarnessToolRegistryQuery = {}): AgentHarnessTool[] {
		const allow = input.allow ? new Set(input.allow) : undefined;
		const deny = new Set(input.deny ?? []);
		const groups = input.groups ? new Set(input.groups) : undefined;
		return [...this.tools.values()].filter((tool) => {
			if (tool.enabled === false && !input.includeDisabled) return false;
			if (allow && !allow.has(tool.name)) return false;
			if (deny.has(tool.name)) return false;
			if (groups && (!tool.group || !groups.has(tool.group))) return false;
			return true;
		});
	}
}

export function filterToolsByPermissions(
	tools: AgentHarnessTool[],
	input: {
		permissions?: AgentHarnessPermissions;
		enabledTools?: string[];
		disabledTools?: string[];
		toolGroups?: string[];
	}
): AgentHarnessTool[] {
	const allow = input.enabledTools ?? input.permissions?.allowTools;
	const deny = new Set([...(input.disabledTools ?? []), ...(input.permissions?.denyTools ?? [])]);
	const allowSet = allow ? new Set(allow) : undefined;
	const groupSet = input.toolGroups ? new Set(input.toolGroups) : undefined;
	return tools.filter((tool) => {
		if (tool.enabled === false) return false;
		if (allowSet && !allowSet.has(tool.name)) return false;
		if (deny.has(tool.name)) return false;
		if (groupSet && (!tool.group || !groupSet.has(tool.group))) return false;
		return true;
	});
}

export function requiresPolicyApproval(tool: AgentHarnessTool, permissions: AgentHarnessPermissions | undefined): boolean {
	if (tool.destructive && permissions?.requireApprovalForDestructiveTools !== false) return true;
	if (tool.externalWrite && permissions?.requireApprovalForExternalWrites !== false) return true;
	return false;
}
