import { toolCommandName } from './policy_command';
import { pathModeFor } from './policy_override';
import { isPathWithin } from './policy_path';
import { getToolAllowedCommands, getToolAllowedPaths, getToolPermission } from './policy_store';
import { toolTargetDirs } from './policy_targets';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

function isDirAllowed(toolName: string, dir: string): boolean {
	return getToolAllowedPaths(toolName).some((allowed) => isPathWithin(allowed, dir));
}

// Fold the path-rule modes of a tool's target dirs into one, most restrictive
// wins: deny > ask > allow.
function pathOverride(dirs: string[]): PermissionMode | undefined {
	const modes = dirs.map(pathModeFor);
	if (modes.includes('deny')) return 'deny';
	if (modes.includes('ask')) return 'ask';
	if (modes.includes('allow')) return 'allow';
	return undefined;
}

// Resolution order: a matching path rule overrides everything (a 'deny' rule
// blocks reads too), then ungated tools pass, then the tool's stored mode, then
// — for 'ask' — previously granted paths (and commands, for exec) pass without
// asking.
export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	const dirs = toolTargetDirs(toolName, args);
	const override = pathOverride(dirs);
	if (override) return override;
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (!command || !getToolAllowedCommands(toolName).includes(command)) return 'ask';
	}
	return dirs.every((dir) => isDirAllowed(toolName, dir)) ? 'allow' : 'ask';
}
