import path from 'node:path';
import { resolveUserPath, toolPathDir } from './policy_path';

const PATCH_TARGET = /^\*\*\* (?:Add|Delete|Update) File: (.+)$/gm;
const PATCH_MOVE = /^\*\*\* Move to: (.+)$/gm;

function patchDirs(input: string): string[] {
	const dirs: string[] = [];
	for (const match of input.matchAll(PATCH_TARGET))
		dirs.push(path.dirname(resolveUserPath(match[1].trim())));
	for (const match of input.matchAll(PATCH_MOVE))
		dirs.push(path.dirname(resolveUserPath(match[1].trim())));
	return dirs;
}

// ponytail: exec is confined by its workdir only; a command can still touch paths
// outside the sandbox. Airtight confinement needs OS-level isolation, not cwd checks.
export function toolTargetDirs(toolName: string, args: Record<string, unknown>): string[] {
	if (toolName === 'apply_patch')
		return typeof args.input === 'string' ? patchDirs(args.input) : [];
	if (toolName === 'exec') {
		const workdir = typeof args.workdir === 'string' && args.workdir.length > 0 ? args.workdir : '.';
		return [resolveUserPath(workdir)];
	}
	const dir = toolPathDir(args);
	return dir ? [dir] : [];
}
