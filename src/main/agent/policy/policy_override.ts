import os from 'node:os';
import { resolveUserPath } from '../../shared/user_path';
import { realPath } from '../../shared/real_path';
import { isPathWithin } from './policy_path';
import { isToolPermission } from './policy_is_tool_permission';
import { getPermissions } from '../agent_store';
import type { PermissionMode, ToolPermission } from './policy_types';

const PRIORITY: Record<PermissionMode, number> = { allow: 1, ask: 2, deny: 3 };

function commandMatches(rule: string, command: string): boolean {
	if (rule === command) return true;
	if (!rule.endsWith(':*')) return false;
	const base = rule.slice(0, -2);
	return command === base || command.startsWith(`${base} `) || command.startsWith(`${base}/`);
}

export function toolPermissionFor(
	toolName: string,
	target: string,
	configured?: ToolPermission
): PermissionMode | undefined {
	const permission = configured ?? getPermissions()[toolName];
	if (!isToolPermission(permission)) return undefined;
	let best: { specificity: number; decision: PermissionMode } | undefined;
	for (const decision of ['allow', 'ask', 'deny'] as const) {
		for (const rule of permission[decision]) {
			const matches =
				toolName === 'exec'
					? commandMatches(rule, target)
					: isPathWithin(realPath(resolveUserPath(rule, os.homedir())), target);
			if (!matches) continue;
			const specificity = rule.length;
			if (
				!best ||
				specificity > best.specificity ||
				(specificity === best.specificity && PRIORITY[decision] > PRIORITY[best.decision])
			)
				best = { specificity, decision };
		}
	}
	return best?.decision;
}
