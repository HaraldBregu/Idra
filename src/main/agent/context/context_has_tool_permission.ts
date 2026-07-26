import type { ToolsContext } from './context_types';

export function hasToolPermission(
	context: ToolsContext | undefined,
	toolName: string,
	folderPath: string
): boolean {
	return (
		context?.tools?.some(
			(state) => state.toolName === toolName && state.folderPath === folderPath
		) ?? false
	);
}
