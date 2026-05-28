import type { AgentTool, ToolContext } from '../capabilities/local/types';

export type ToolProfile = 'minimal' | 'standard' | 'full';
export interface ToolAccessSubject {
	tool: AgentTool;
	ctx?: ToolContext;
}

export function evaluateToolAccess(
	subject: ToolAccessSubject,
	policy: { allow?: string[]; deny?: string[] } = {}
): { allowed: boolean; reason?: string } {
	if (policy.deny?.includes(subject.tool.name)) return { allowed: false, reason: 'Tool is denied.' };
	if (policy.allow?.length && !policy.allow.includes(subject.tool.name)) {
		return { allowed: false, reason: 'Tool is not allowed.' };
	}
	return { allowed: true };
}

export function evaluateToolRequestPolicy(tool: AgentTool, policy?: { allow?: string[]; deny?: string[] }) {
	return evaluateToolAccess({ tool }, policy);
}
