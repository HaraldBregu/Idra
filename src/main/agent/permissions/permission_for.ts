import os from 'node:os';
import path from 'node:path';
import { resolveUserPath } from '../../shared/user_path';
import type { PermissionKind, PermissionMode, PermissionRules } from './permissions_types';

export function permissionFor(
	rules: PermissionRules,
	target: string,
	kind: PermissionKind,
	elevated = false
): PermissionMode | undefined {
	if (kind === 'exec') {
		const segments = target.split(/&&|\|\||[;|\n]/).map((segment) => segment.trim()).filter(Boolean);
		const matches = (rule: string, segment: string, deny: boolean): boolean => {
			if (rule === '*') return !elevated;
			if (deny || !rule.includes(' ')) return segment === rule || segment.startsWith(`${rule} `);
			return segment === rule;
		};
		if (rules.deny.some((rule) => segments.some((segment) => matches(rule, segment, true))))
			return 'deny';
		if (/\$\(|`|[<>]/.test(target)) return undefined;
		if (
			segments.length > 0 &&
			segments.every((segment) => rules.allow.some((rule) => matches(rule, segment, false)))
		) return 'allow';
		return undefined;
	}
	const matches = (rule: string): boolean => {
		const pattern = resolveUserPath(rule, os.homedir());
		try {
			return target === pattern || path.matchesGlob(target, pattern);
		} catch {
			return false;
		}
	};
	if (rules.deny.some(matches)) return 'deny';
	if (rules.allow.some(matches)) return 'allow';
	return undefined;
}
