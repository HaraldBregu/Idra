import { toolPermissionFor } from './permissions_override';
import type { PermissionMode, ToolPermission } from './permissions_types';

export interface ToolPermissionResolution {
	permission: PermissionMode;
	contextCanAllow: boolean;
	explicit?: PermissionMode;
}

export function resolveStoredToolPermission(
	toolName: string,
	targets: string[],
	configured: ToolPermission | undefined,
	fallback: PermissionMode
): ToolPermissionResolution {
	if (targets.length === 0) return { permission: configured?.default ?? fallback, contextCanAllow: true };
	const decisions = targets.map((target) =>
		configured ? toolPermissionFor(toolName, target, configured) : undefined
	);
	const explicit = decisions.includes('deny')
		? 'deny'
		: decisions.includes('ask')
			? 'ask'
			: decisions.every((decision) => decision === 'allow')
				? 'allow'
				: undefined;
	return {
		permission: explicit ?? configured?.default ?? fallback,
		contextCanAllow: explicit !== 'ask',
		...(explicit ? { explicit } : {}),
	};
}
