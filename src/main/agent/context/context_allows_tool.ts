import { fileToolState } from './context_file_tool_state';
import { hasCreatedFile } from './context_has_created_file';
import { hasToolPermission } from './context_has_tool_permission';
import type { ToolsContext } from './context_types';

export function contextAllowsTool(
	context: ToolsContext | undefined,
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string
): boolean {
	const state = fileToolState(toolName, args, baseDir);
	if (!state) return false;
	if (toolName === 'edit_file') return hasCreatedFile(context, state.path);
	// ponytail: an approved read grants its whole folder for the rest of the run, so a
	// multi-file read does not prompt per file. Match on state.path for file-exact grants.
	return toolName === 'read_file' && hasToolPermission(context, toolName, state.folderPath);
}
