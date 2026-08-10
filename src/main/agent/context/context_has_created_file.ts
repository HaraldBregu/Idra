import type { ToolsContext } from './context_types';

export function hasCreatedFile(context: ToolsContext | undefined, filePath: string): boolean {
	return (
		context?.tools?.some((state) => state.toolName === 'write_file' && state.path === filePath) ??
		false
	);
}
