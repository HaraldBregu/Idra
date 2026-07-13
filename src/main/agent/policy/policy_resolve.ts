import { toolCommandName } from './policy_command';
import { isPathWithin } from './policy_path';
import { getToolAllowedCommands, getToolAllowedPaths, getToolPermission } from './policy_store';
import { toolTargetDirs } from './policy_targets';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

function isDirAllowed(toolName: string, dir: string): boolean {
	return getToolAllowedPaths(toolName).some((allowed) => isPathWithin(allowed, dir));
}

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	// Inside the sandbox (agent location, tmpdir) the agent works without permissions.
	const outside = toolTargetDirs(toolName, args).filter((dir) => !isWithinSandbox(dir));
	if (outside.length === 0) return 'allow';
	// Outside the sandbox, only previously granted paths (and commands, for exec) pass.
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (!command || !getToolAllowedCommands(toolName).includes(command)) return 'ask';
	}
	return outside.every((dir) => isDirAllowed(toolName, dir)) ? 'allow' : 'ask';
}
