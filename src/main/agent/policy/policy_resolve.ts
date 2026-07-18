import { contextAllowsTool, type AgentContext } from '../context';
import { directoryAllowsTool } from './policy_directory';
import { isToolPermission } from './policy_is_tool_permission';
import { toolPermissionFor } from './policy_override';
import { AGENT_DIRECTORY, getPermissions } from './policy_store';
import { toolPermissionTargets } from './policy_targets';
import type { DirectoryPermissions, PermissionMode } from './policy_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
	context?: AgentContext
): PermissionMode {
	const targets = toolPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const policy = getPermissions();
	const configuredEntry = policy[toolName];
	const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
	const directories = policy.dir as DirectoryPermissions;
	let permission: PermissionMode;
	if (!configured) permission = targets.length > 0 ? 'ask' : 'allow';
	else if (targets.length === 0) permission = configured.default;
	else {
		const decisions = targets.map((target) => {
			const explicit = toolPermissionFor(toolName, target);
			if (explicit) return explicit;
			return directoryAllowsTool(directories, toolName, target) ? 'allow' : configured.default;
		});
		permission = decisions.includes('deny') ? 'deny' : decisions.includes('ask') ? 'ask' : 'allow';
	}

	if (permission === 'ask' && contextAllowsTool(context, toolName, args, AGENT_DIRECTORY))
		return 'allow';
	return permission;
}
