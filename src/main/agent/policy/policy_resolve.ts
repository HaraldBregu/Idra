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

// Resolution order: a "Tool(pattern)" rule wins first, then a matching path rule
// (a 'deny' there blocks reads too), then ungated tools pass, then the tool's
// stored mode, then — for 'ask' — previously granted paths (and commands, for
// exec) pass without asking.
export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
): PermissionMode {
	const ruled = ruleOverride(toolName, args);
	if (ruled) return ruled;
	const dirs = toolTargetDirs(toolName, args);
	const override = pathOverride(toolName, dirs);
	if (override) return override;
	if (!isPermissionGatedTool(toolName)) return 'allow';
	const mode = getToolPermission(toolName);
	if (mode !== 'ask') return mode;
	if (toolName === 'exec') {
		const command = toolCommandName(args);
		if (!command || !getToolAllowedCommands(toolName).includes(command)) return 'ask';
	}
	return dirs.every((dir) => isDirAllowed(toolName, dir)) ? 'allow' : 'ask';
}
