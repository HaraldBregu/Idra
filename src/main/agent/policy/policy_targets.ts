import path from 'node:path';
import { resolveUserPath } from '../../shared/user_path';
import { toolPathDir } from './policy_path';

const PATCH_TARGET = /^[ \t]*[*]{3} (?:Add|Delete|Update) File: (.+?)[ \t]*$/gm;
const PATCH_MOVE = /^[ \t]*[*]{3} Move to: (.+?)[ \t]*$/gm;

function patchDirs(input: string, baseDir: string): string[] {
	const dirs: string[] = [];
	for (const match of input.matchAll(PATCH_TARGET))
		dirs.push(path.dirname(resolveUserPath(match[1], baseDir)));
	for (const match of input.matchAll(PATCH_MOVE))
		dirs.push(path.dirname(resolveUserPath(match[1], baseDir)));
	return dirs;
}

// ponytail: exec is gated by its workdir only; a command can still touch paths
// outside it. Airtight confinement needs OS-level isolation, not cwd checks.
export function toolTargetDirs(
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string,
): string[] {
	if (toolName === 'apply_patch')
		return typeof args.input === 'string' ? patchDirs(args.input, baseDir) : [];
	if (toolName === 'exec') {
		const workdir = typeof args.workdir === 'string' && args.workdir.length > 0 ? args.workdir : '.';
		return [resolveUserPath(workdir, baseDir)];
	}
	const dir = toolPathDir(args, baseDir);
	return dir ? [dir] : [];
}
