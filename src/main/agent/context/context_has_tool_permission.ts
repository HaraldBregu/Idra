import type { AgentContext } from './context_types';

export function hasToolPermission(
	context: AgentContext | undefined,
	toolName: string,
	folderPath: string,
): boolean {
	return (
		context?.tools?.some(
			(state) =>
				state.toolName === toolName && state.folderPath === folderPath,
		) ?? false
	);
}
