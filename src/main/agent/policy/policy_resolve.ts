import { contextAllowsTool, type ToolsContext } from '../context';
import { directoryPolicyAllows } from './policy_directories';
import { directoryPermissionTargets } from './policy_directory_targets';
import { isToolPermission } from './policy_is_tool_permission';
import { AGENT_DIRECTORY, getPermissions } from '../agent_store';
import { systemPolicyAllows } from './policy_system';
import { toolPermissionTargets } from './policy_targets';
import { resolveStoredToolPolicy } from './policy_tool';
import type { PermissionMode } from './policy_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
	context?: ToolsContext,
	reuseContext = true,
	fallback: PermissionMode = 'ask'
): PermissionMode {
	const targets = toolPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const directoryTargets = directoryPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const policy = getPermissions();
	const configuredEntry = policy[toolName];
	const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
	const directories = policy.dir ?? {};
	if (systemPolicyAllows(directoryTargets, AGENT_DIRECTORY)) return 'allow';
	if (directoryPolicyAllows(directories, toolName, directoryTargets)) return 'allow';
	const { permission, contextCanAllow } = resolveStoredToolPolicy(
		toolName,
		targets,
		configured,
		fallback
	);

	if (
		permission === 'ask' &&
		reuseContext &&
		contextCanAllow &&
		contextAllowsTool(context, toolName, args, AGENT_DIRECTORY)
	)
		return 'allow';
	return permission;
}
