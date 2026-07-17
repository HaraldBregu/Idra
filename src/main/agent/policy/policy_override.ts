import { resolveUserPath } from '../../shared/user_path';
import { realPath } from '../../shared/real_path';
import { isPathWithin } from './policy_path';
import { AGENT_DIRECTORY, getPathPermissions } from './policy_store';
import type { PermissionMode, ToolSelector } from './policy_types';

function listMatches(selector: ToolSelector, toolName: string): boolean {
	if (selector === '*') return true;
	return selector.includes('*') || selector.includes(toolName);
}

// The decision a single rule makes for a tool: deny wins over ask wins over
// allow, and a rule that mentions none of them stays out of the way.
function ruleDecision(
	allow: ToolSelector,
	deny: ToolSelector,
	ask: ToolSelector,
	toolName: string,
): PermissionMode | undefined {
	if (listMatches(deny, toolName)) return 'deny';
	if (listMatches(ask, toolName)) return 'ask';
	if (listMatches(allow, toolName)) return 'allow';
	return undefined;
}

// The permission a path rule imposes on `toolName` at `dir`, or undefined when
// no rule applies. When several rules match, the deepest (most specific) path
// wins.
export function pathPermissionFor(toolName: string, dir: string): PermissionMode | undefined {
	let best: { root: string; decision: PermissionMode } | undefined;
	for (const { path, allow, deny, ask, recursive } of getPathPermissions()) {
		const root = realPath(resolveUserPath(path, AGENT_DIRECTORY));
		const matches = recursive ? isPathWithin(root, dir) : root === dir;
		if (!matches) continue;
		const decision = ruleDecision(allow, deny, ask, toolName);
		if (decision && (!best || root.length > best.root.length)) best = { root, decision };
	}
	return best?.decision;
}
