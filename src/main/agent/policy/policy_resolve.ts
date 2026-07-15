import { isDestructiveCommand } from './policy_exec';
import { pathPermissionFor } from './policy_override';
import { getDefaultMode, getPermissionRules } from './policy_store';
import { toolRuleSignature } from './policy_signature';
import { toolTargetDirs } from './policy_targets';
import { isPermissionGatedTool, type PermissionMode } from './policy_types';

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

// Resolution order: a defaultPermissions path rule overrides everything (an
// allow-'*' folder frees every tool there, a 'deny' blocks reads too), then
// "Tool(pattern)" rules, then ungated tools (read, write, ...) pass, then exec
// passes unless the command is destructive, and what's left falls back to the
// default mode.
export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	const override = pathOverride(toolName, toolTargetDirs(toolName, args));
	if (override) return override;
	const ruled = ruleOverride(toolName, args);
	if (ruled) return ruled;
	if (!isPermissionGatedTool(toolName)) return 'allow';
	if (toolName === 'exec' && typeof args.command === 'string' && !isDestructiveCommand(args.command))
		return 'allow';
	return getDefaultMode();
}
