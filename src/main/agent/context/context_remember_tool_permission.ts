import type {
	AgentContext,
	ToolPermissionContextState,
} from './context_types';

export function rememberToolPermission(
	context: AgentContext | undefined,
	state: ToolPermissionContextState,
): void {
	if (!context) return;
	const permissions = (context.toolPermissions ??= []);
	if (
		permissions.some(
			(existing) =>
				existing.toolName === state.toolName &&
				existing.folderPath === state.folderPath &&
				existing.permission === state.permission,
		)
	)
		return;
	permissions.push(state);
}
