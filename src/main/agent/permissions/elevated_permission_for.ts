import type { PermissionMode, ToolPermission } from './permissions_types';

const PRIORITY: Record<PermissionMode, number> = { allow: 1, ask: 2, deny: 3 };

export function elevatedPermissionFor(
	command: string,
	permission: ToolPermission | undefined,
	fallback: PermissionMode
): PermissionMode {
	let result: PermissionMode | undefined;
	for (const decision of ['allow', 'ask', 'deny'] as const) {
		if (!permission?.[decision].includes(command)) continue;
		if (!result || PRIORITY[decision] > PRIORITY[result]) result = decision;
	}
	return result ?? fallback;
}
