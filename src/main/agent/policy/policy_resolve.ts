import { pathPermissionFor } from './policy_override';
import { isPathWithin } from './policy_path';
import { AGENT_DIRECTORY, getDefaultMode, getPermissionRules } from './policy_store';
import { toolRuleSignature } from './policy_signature';
import { toolTargetDirs } from './policy_targets';
import type { PermissionMode } from './policy_types';

function ruleMatches(rule: string, signature: string): boolean {
	if (rule === signature) return true;
	// ponytail: only a trailing ":*" wildcard. The base must end at a boundary —
	// exact, then a space (next argv token) or "/" (next path segment) — so
	// "Bash(git:*)" matches "git" and "git push" but never "git-evil".
	if (rule.endsWith(':*)')) {
		const base = rule.slice(0, -3);
		return (
			signature === `${base})` ||
			signature.startsWith(`${base} `) ||
			signature.startsWith(`${base}/`)
		);
	}
	return false;
}

// A "Tool(pattern)" rule matching this call: deny > ask > allow.
function ruleOverride(toolName: string, args: Record<string, unknown>): PermissionMode | undefined {
	const signature = toolRuleSignature(toolName, args);
	if (!signature) return undefined;
	const { allow, deny, ask } = getPermissionRules();
	const hit = (rules: string[]): boolean => rules.some((rule) => ruleMatches(rule, signature));
	if (hit(deny)) return 'deny';
	if (hit(ask)) return 'ask';
	if (hit(allow)) return 'allow';
	return undefined;
}

// Fold the path-rule decisions across a tool's target dirs into one, most
// restrictive wins: deny > ask > allow.
function pathOverride(toolName: string, dirs: string[]): PermissionMode | undefined {
	const decisions = dirs.map((dir) => pathPermissionFor(toolName, dir));
	if (decisions.includes('deny')) return 'deny';
	if (decisions.includes('ask')) return 'ask';
	if (decisions.includes('allow')) return 'allow';
	return undefined;
}

// The agent data directory is an unconditional trust boundary. Outside it,
// path and tool rules apply before the default permission mode.
export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	const targetDirs = toolTargetDirs(toolName, args);
	if (
		targetDirs.length > 0 &&
		targetDirs.every((targetDir) => isPathWithin(AGENT_DIRECTORY, targetDir))
	)
		return 'allow';

	const override = pathOverride(toolName, targetDirs);
	if (override) return override;
	const ruled = ruleOverride(toolName, args);
	if (ruled) return ruled;
	return targetDirs.length > 0 ? getDefaultMode() : 'allow';
}
