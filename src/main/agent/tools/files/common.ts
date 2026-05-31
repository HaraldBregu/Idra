import type { Stats } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentTool } from '../core/types';

function expandUser(p: string): string {
	if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
	return p;
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
	if (!last)
		return `${action}: must read ${label} before ${action === 'delete_file' ? 'deleting' : 'overwriting'}.`;
	if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
		return `${action}: ${label} changed on disk since last read. Re-read first.`;
	}
	return null;
}

export function guardedRootMessage(workspace: string, abs: string): string | null {
	const resolved = path.resolve(abs);
	if (resolved === path.parse(resolved).root) return 'refusing to operate on filesystem root';
	if (resolved === path.resolve(workspace)) return 'refusing to operate on workspace root';
	if (resolved === path.resolve(os.homedir())) return 'refusing to operate on home directory';
	return null;
}
