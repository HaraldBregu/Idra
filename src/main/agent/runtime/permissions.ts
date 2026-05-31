import type { AgentContext, PermissionDecision, Tool } from './types';

export async function resolvePermission<Input>(
	tool: Tool<Input, unknown>,
	input: Input,
	context: AgentContext
): Promise<PermissionDecision> {
	const policy = context.permissionContext;
	if (policy.mode === 'bypass') return { behavior: 'allow' };
	if (policy.alwaysDenyRules.some((rule) => rule.toolName === tool.name)) {
		return { behavior: 'deny', message: `Tool ${tool.name} is denied by policy.` };
	}
	if (policy.alwaysAllowRules.some((rule) => rule.toolName === tool.name)) {
		return { behavior: 'allow' };
	}
	const decision = await tool.checkPermissions(input, context);
	if (decision.behavior !== 'ask') return decision;
	if (policy.mode === 'auto') return { behavior: 'allow', input: decision.input };
	if (!policy.requestApproval) return { behavior: 'deny', message: decision.message };
	return policy.requestApproval({
		toolName: tool.name,
		input: decision.input ?? input,
		message: decision.message,
	});
}
