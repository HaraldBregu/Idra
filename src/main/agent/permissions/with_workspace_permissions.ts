import type { PermissionsSchema } from './permissions_types';
import path from 'node:path';
import { permissionRuleRoot } from './permission_rule_root';

export function withWorkspacePermissions(
	permissions: PermissionsSchema,
	workspacePattern: string
): PermissionsSchema {
	const workspace = permissionRuleRoot(workspacePattern);
	const outsideWorkspace = (rule: string): boolean => {
		const target = permissionRuleRoot(rule);
		return target !== workspace && !target.startsWith(`${workspace}${path.sep}`);
	};
	const execDeny = permissions.exec.deny.filter(outsideWorkspace);
	const safeExecAllow = permissions.exec.allow.filter((rule) => {
		const allowed = permissionRuleRoot(rule);
		return !execDeny.some((deniedRule) => {
			const denied = permissionRuleRoot(deniedRule);
			return denied === allowed || denied.startsWith(`${allowed}${path.sep}`);
		});
	});
	return {
		read: {
			...permissions.read,
			allow: [...new Set([workspacePattern, ...permissions.read.allow])],
			deny: permissions.read.deny.filter(outsideWorkspace),
		},
		write: {
			...permissions.write,
			allow: [...new Set([workspacePattern, ...permissions.write.allow])],
			deny: permissions.write.deny.filter(outsideWorkspace),
		},
		exec: {
			...permissions.exec,
			allow: [...new Set([workspacePattern, ...safeExecAllow])],
			deny: execDeny,
		},
	};
}
