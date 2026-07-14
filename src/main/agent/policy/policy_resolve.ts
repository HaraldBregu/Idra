import { toolCommandName } from './policy_command';
import { isPathWithin } from './policy_path';
import { restrictedToolDir } from './policy_restricted';
import { getToolAllowedCommands, getToolAllowedPaths, getToolPermission } from './policy_store';
import { toolTargetDirs } from './policy_targets';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

function isDirAllowed(toolName: string, dir: string): boolean {
	return getToolAllowedPaths(toolName).some((allowed) => isPathWithin(allowed, dir));
}

// Resolution order: restricted directories deny every tool (read included),
// then ungated tools pass, then the tool's stored mode, then — for 'ask' —
// previously granted paths (and commands, for exec) pass without asking.
export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	if (restrictedToolDir(toolName, args)) return 'deny';
	const dirs = toolTargetDirs(toolName, args);
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (!command || !getToolAllowedCommands(toolName).includes(command)) return 'ask';
	}
	return dirs.every((dir) => isDirAllowed(toolName, dir)) ? 'allow' : 'ask';
}
