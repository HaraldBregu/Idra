import { isPathWithin, resolveUserPath } from './policy_path';
import { getPathPermissions } from './policy_store';
import type { PermissionMode } from './policy_types';

function listMatches(list: string[], toolName: string): boolean {
	return list.includes('*') || list.includes(toolName);
}

// The decision a single rule makes for a tool: deny wins over allow, and a rule
// that mentions neither stays out of the way.
function ruleDecision(allow: string[], deny: string[], toolName: string): PermissionMode | undefined {
	if (listMatches(deny, toolName)) return 'deny';
	if (listMatches(allow, toolName)) return 'allow';
	return undefined;
}

// The permission a path rule imposes on `toolName` at `dir`, or undefined when
// no rule applies. When several rules match, the deepest (most specific) path
// wins.
export function pathPermissionFor(toolName: string, dir: string): PermissionMode | undefined {
	let best: { root: string; decision: PermissionMode } | undefined;
	for (const { absolutePath, allow, deny } of getPathPermissions()) {
		const root = resolveUserPath(absolutePath);
		if (!isPathWithin(root, dir)) continue;
		const decision = ruleDecision(allow, deny, toolName);
		if (decision && (!best || root.length > best.root.length)) best = { root, decision };
	}
	return best?.decision;
}
