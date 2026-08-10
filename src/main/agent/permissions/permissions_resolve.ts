import { contextAllowsTool, type ToolsContext } from '../context';
import { directoryPermissionAllows } from './permissions_directories';
import { directoryPermissionTargets } from './permissions_directory_targets';
import { isToolPermission } from './permissions_is_tool_permission';
import { AGENT_DIRECTORY, getPermissions } from '../agent_store';
import { systemPermissionAllows } from './permissions_system';
import { toolPermissionTargets } from './permissions_targets';
import { resolveStoredToolPermission } from './permissions_tool';
import type { PermissionMode } from './permissions_types';
import type { PermissionsSchema } from './permissions_types';

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
	context?: ToolsContext,
	reuseContext = true,
	fallback: PermissionMode = 'ask',
	configuredPermissions?: PermissionsSchema
): PermissionMode {
	const targets = toolPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const directoryTargets = directoryPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const permissions = configuredPermissions ?? getPermissions();
	const configuredEntry = permissions[toolName];
	const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
	const directories = permissions.dir ?? {};
	const stored = resolveStoredToolPermission(toolName, targets, configured, fallback);
	if (stored.explicit === 'deny' || stored.explicit === 'ask') return stored.explicit;
	if (stored.explicit === 'allow') return 'allow';
	if (directoryPermissionAllows(directories, toolName, directoryTargets)) return 'allow';
	if (systemPermissionAllows(toolName, directoryTargets, AGENT_DIRECTORY)) return 'allow';

	if (
		stored.permission === 'ask' &&
		reuseContext &&
		stored.contextCanAllow &&
		contextAllowsTool(context, toolName, args, AGENT_DIRECTORY)
	)
		return 'allow';
	return stored.permission;
}
