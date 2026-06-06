import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function expandUser(target: string): string {
	if (target.startsWith('~')) return path.join(os.homedir(), target.slice(1));
	return target;
}

export function resolveAbs(workspace: string, target: string): string {
	const expanded = expandUser(target);
	return path.isAbsolute(expanded)
		? path.resolve(expanded)
		: path.resolve(workspace, expanded);
}

export function snapshot(stat: Stats): { mtimeMs: number; size: number } {
	return { mtimeMs: stat.mtimeMs, size: stat.size };
}

export function requireReadSnapshot(
	ctx: { readState: Map<string, { mtimeMs: number; size: number }> },
	abs: string,
	stat: Stats,
	label: string,
	action: string
): string | null {
	const last = ctx.readState.get(abs);
	if (!last) return `${action}: must read ${label} before mutating it.`;
	if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
		return `${action}: ${label} changed on disk since last read. Re-read first.`;
	}
	return null;
}
