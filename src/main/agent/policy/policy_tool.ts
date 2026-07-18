import { toolPermissionFor } from './policy_override';
import type { PermissionMode, ToolPermission } from './policy_types';

export interface ToolPolicyResolution {
	permission: PermissionMode;
	contextCanAllow: boolean;
}

export function resolveStoredToolPolicy(
	toolName: string,
	targets: string[],
	configured: ToolPermission | undefined,
	fallback: PermissionMode
): ToolPolicyResolution {
	if (targets.length === 0)
		return { permission: configured?.default ?? fallback, contextCanAllow: true };
	let contextCanAllow = true;
	const decisions = targets.map((target) => {
		const explicit = configured ? toolPermissionFor(toolName, target, configured) : undefined;
		if (!explicit) return configured?.default ?? fallback;
		if (explicit === 'ask') contextCanAllow = false;
		return explicit;
	});
	return {
		permission: decisions.includes('deny')
			? 'deny'
			: decisions.includes('ask')
				? 'ask'
				: 'allow',
		contextCanAllow,
	};
}
