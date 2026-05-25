import path from 'node:path';
import type { PolicyConfig, PolicyEntry } from '../../shared/policy';

export function match(config: PolicyConfig, resolvedPath: string): PolicyEntry | null {
	let best: PolicyEntry | null = null;
	let bestLen = -1;

	for (const entry of config.paths) {
		const isExact = resolvedPath === entry.path;
		const isDescendant = resolvedPath.startsWith(entry.path + '/');

		if (!isExact && !isDescendant) continue;

		if (!entry.recursive && isDescendant) {
			// recursive: false — direct children only, not deeper descendants
			if (path.dirname(resolvedPath) !== entry.path) continue;
		}

		if (entry.path.length > bestLen) {
			best = entry;
			bestLen = entry.path.length;
		}
	}

	return best;
}
