import os from 'node:os';
import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import { isPathWithin } from './policy_path';
import type { DirectoryPermissions } from './policy_types';

export function directoryAllowsTool(
	directories: DirectoryPermissions,
	toolName: string,
	target: string
): boolean {
	if (toolName === 'exec') return false;
	const targetDirectory = toolName === 'read' ? target : path.dirname(target);
	for (const [directory, permission] of Object.entries(directories)) {
		if (permission.tools !== '*' && !permission.tools.includes(toolName)) continue;
		const root = realPath(resolveUserPath(directory, os.homedir()));
		if (permission.recoursive ? isPathWithin(root, targetDirectory) : root === targetDirectory)
			return true;
	}
	return false;
}
