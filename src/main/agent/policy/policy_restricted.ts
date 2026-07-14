import path from 'node:path';
import { isPathWithin, resolveUserPath } from './policy_path';
import { getRestrictedDirectories } from './policy_store';
import { toolTargetDirs } from './policy_targets';

export function isDirRestricted(dir: string): boolean {
	return getRestrictedDirectories().some(({ path: restricted, recursive }) => {
		const root = resolveUserPath(restricted);
		return recursive ? isPathWithin(root, dir) : root === dir;
	});
}

// ponytail: heuristic — absolute and ~ path tokens only; relative paths and
// paths built at runtime need OS-level isolation, not string scanning.
const COMMAND_PATH = /(?:^|[\s='"])((?:~|\/)[^\s'"`;|&<>)]*)/g;

function commandPathDirs(command: string): string[] {
	const dirs: string[] = [];
	for (const match of command.matchAll(COMMAND_PATH)) {
		const resolved = resolveUserPath(match[1]);
		dirs.push(resolved, path.dirname(resolved));
	}
	return dirs;
}

// The restricted directory hit by this tool call, if any. Checks the tool's
// target dirs and, for exec, every path mentioned in the command itself.
export function restrictedToolDir(
	toolName: string,
	args: Record<string, unknown>,
): string | undefined {
	const dirs = [...toolTargetDirs(toolName, args)];
	if (toolName === 'exec' && typeof args.command === 'string')
		dirs.push(...commandPathDirs(args.command));
	return dirs.find(isDirRestricted);
}
