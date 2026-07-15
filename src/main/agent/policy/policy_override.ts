import { isPathWithin, resolveUserPath } from './policy_path';
import { getPathModes } from './policy_store';
import type { PermissionMode } from './policy_types';

// The permission mode a path rule imposes on a directory, or undefined when no
// rule matches. When several rules match, the deepest (most specific) path wins.
export function pathModeFor(dir: string): PermissionMode | undefined {
	let best: { root: string; mode: PermissionMode } | undefined;
	for (const { path: rule, mode, recursive } of getPathModes()) {
		const root = resolveUserPath(rule);
		const matches = recursive ? isPathWithin(root, dir) : root === dir;
		if (matches && (!best || root.length > best.root.length)) best = { root, mode };
	}
	return best?.mode;
}
