import os from 'node:os';
import path from 'node:path';
import { isPathWithin, toolPathDir } from '../policy';
import { getSandboxRoots } from './sandbox_store';

// ponytail: exec is confined by its workdir only; a command can still touch paths
// outside the sandbox. Airtight confinement needs OS-level isolation, not cwd checks.
const SANDBOXED_TOOLS = new Set(['write', 'edit', 'apply_patch', 'exec']);
const PATCH_TARGET = /^\*\*\* (?:Add|Delete|Update) File: (.+)$/gm;
const PATCH_MOVE = /^\*\*\* Move to: (.+)$/gm;

function resolveUserPath(raw: string): string {
	if (raw === '~') return os.homedir();
	if (raw.startsWith('~/') || raw.startsWith('~\\')) return path.resolve(os.homedir(), raw.slice(2));
	return path.resolve(raw);
}

function patchDirs(input: string): string[] {
	const dirs: string[] = [];
	for (const match of input.matchAll(PATCH_TARGET))
		dirs.push(path.dirname(resolveUserPath(match[1].trim())));
	for (const match of input.matchAll(PATCH_MOVE))
		dirs.push(path.dirname(resolveUserPath(match[1].trim())));
	return dirs;
}

function toolTargetDirs(toolName: string, args: Record<string, unknown>): string[] {
	if (toolName === 'apply_patch')
		return typeof args.input === 'string' ? patchDirs(args.input) : [];
	const dir = toolPathDir(args);
	return dir ? [dir] : [];
}

function isWithinSandbox(dir: string): boolean {
	return getSandboxRoots().some((root) => isPathWithin(root, dir));
}

export function sandboxEscapes(toolName: string, args: Record<string, unknown>): string[] {
	if (!SANDBOXED_TOOLS.has(toolName)) return [];
	return toolTargetDirs(toolName, args).filter((dir) => !isWithinSandbox(dir));
}
