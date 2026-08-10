import { contextAllowsTool, type ToolsContext } from '../context';
import { directoryPermissionAllows } from './directory_permission_allows';
import { directoryPermissionTargets } from './directory_permission_targets';
import { isToolPermission } from './is_tool_permission';
import { AGENT_DIRECTORY, getPermissions } from '../agent_store';
import { toolPermissionTargets } from './tool_permission_targets';
import { resolveStoredToolPermission } from './resolve_stored_tool_permission';
import type { PermissionMode } from './permissions_types';
import type { PermissionsSchema } from './permissions_types';
import { elevatedPermissionFor } from './elevated_permission_for';

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
	if (toolName === 'exec_command' && args.elevated === true) {
		const command = typeof args.command === 'string' ? args.command : '';
		const configuredEntry = permissions.tools[toolName];
		const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
		return elevatedPermissionFor(command, configured, fallback);
	}
	if (toolName === 'process') {
		const target = targets[0];
		if (target) {
			const configuredEntry = permissions.tools[toolName];
			const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
			return elevatedPermissionFor(target, configured, fallback);
		}
	}
	if (directoryPermissionAllows(permissions.directories, toolName, directoryTargets)) return 'allow';
	const configuredEntry = permissions.tools[toolName];
	const configured = isToolPermission(configuredEntry) ? configuredEntry : undefined;
	const stored = resolveStoredToolPermission(toolName, targets, configured, fallback);
	if (stored.explicit === 'deny' || stored.explicit === 'ask') return stored.explicit;
	if (stored.explicit === 'allow') return 'allow';
	if (
		stored.permission === 'ask' &&
		reuseContext &&
		stored.contextCanAllow &&
		contextAllowsTool(context, toolName, args, AGENT_DIRECTORY)
	)
		return 'allow';
	return stored.permission;
}
