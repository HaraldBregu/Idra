import { isBootstrapPath } from './policy_bootstrap';
import { toolCommandName } from './policy_command';
import { patchOnlyAddsFiles } from './policy_patch';
import { isPathWithin, toolPathDir } from './policy_path';
import { getToolAllowedCommands, getToolAllowedPaths, getToolPermission } from './policy_store';
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
	// Patches that delete or update files always re-prompt; creating files is free.
	if (toolName === 'apply_patch') {
		return patchOnlyAddsFiles(args) ? 'allow' : 'ask';
	}
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (!command || !getToolAllowedCommands(toolName).includes(command)) return 'ask';
		const dir = toolPathDir(args);
		if (dir && !isDirAllowed(toolName, dir)) return 'ask';
		return 'allow';
	}
	const dir = toolPathDir(args);
	if (dir && isDirAllowed(toolName, dir)) return 'allow';
	return 'ask';
}
