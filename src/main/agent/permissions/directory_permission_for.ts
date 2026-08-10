import os from 'node:os';
import path from 'node:path';
import { realPath } from '../../shared/real_path';
import { resolveUserPath } from '../../shared/user_path';
import { isPathWithin } from './permissions_path';
import type { DirectoryPermissions, PermissionMode } from './permissions_types';

export function directoryPermissionFor(
	directories: DirectoryPermissions,
	toolName: string,
	target: string
): PermissionMode | undefined {
	const targetDirectory =
		toolName === 'read_file' || toolName === 'exec_command' || toolName === 'process'
			? target
			: path.dirname(target);
	let best: { specificity: number; decision: PermissionMode } | undefined;
	for (const [directory, permission] of Object.entries(directories)) {
		const root = realPath(resolveUserPath(directory, os.homedir()));
		const matches = permission.recoursive
			? isPathWithin(root, targetDirectory)
			: root === targetDirectory;
		if (!matches || (best && best.specificity >= root.length)) continue;
		best = {
			specificity: root.length,
			decision: permission.tools === '*' || permission.tools.includes(toolName) ? 'allow' : 'deny',
		};
	}
	return best?.decision;
}
