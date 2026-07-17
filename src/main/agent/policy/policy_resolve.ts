import { contextAllowsTool, type AgentContext } from '../context';
import { toolPermissionFor } from './policy_override';
import { AGENT_DIRECTORY, getPermissions } from './policy_store';
import { toolPermissionTargets } from './policy_targets';
import type { PermissionMode } from './policy_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
	context?: AgentContext,
): PermissionMode {
	const targets = toolPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const configured = getPermissions()[toolName];
	let permission: PermissionMode;
	if (!configured) permission = targets.length > 0 ? 'ask' : 'allow';
	else if (targets.length === 0) permission = configured.default;
	else {
		const decisions = targets.map(
			(target) => toolPermissionFor(toolName, target) ?? configured.default,
		);
		permission = decisions.includes('deny')
			? 'deny'
			: decisions.includes('ask')
				? 'ask'
				: 'allow';
	}

	if (permission === 'ask' && contextAllowsTool(context, toolName, args, AGENT_DIRECTORY))
		return 'allow';
	return permission;
}
