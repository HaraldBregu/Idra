import { contextAllowsTool, type AgentContext } from '../context';
import { directoryPermissionFor } from './policy_directory';
import { directoryPermissionTargets } from './policy_directory_targets';
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
	const directoryTargets = directoryPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const policy = getPermissions();
	const configuredEntry = policy[toolName];
	const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
	const directories = policy.dir as DirectoryPermissions;
	let permission: PermissionMode;
	if (targets.length === 0) permission = configured?.default ?? 'allow';
	else {
		const decisions = targets.map((target, index) => {
			const explicit = toolPermissionFor(toolName, target);
			if (explicit) return explicit;
			const directoryTarget = directoryTargets[index];
			return (
				(directoryTarget && directoryPermissionFor(directories, toolName, directoryTarget)) ||
				configured?.default ||
				'ask'
			);
		});
		permission = decisions.includes('deny') ? 'deny' : decisions.includes('ask') ? 'ask' : 'allow';
	}

	if (permission === 'ask' && contextAllowsTool(context, toolName, args, AGENT_DIRECTORY))
		return 'allow';
	return permission;
}
