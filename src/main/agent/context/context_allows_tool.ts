import { fileToolState } from './context_file_tool_state';
import { hasCreatedFile } from './context_has_created_file';
import { isFileCreation } from './context_is_file_creation';
import type { AgentContext } from './context_types';

export function contextAllowsTool(
	context: AgentContext | undefined,
	toolName: string,
	args: Record<string, unknown>,
	baseDir: string,
): boolean {
	const state = fileToolState(toolName, args, baseDir);
	if (!state) return false;
	if (isFileCreation(state)) return true;
	return toolName === 'edit' && hasCreatedFile(context, state.path);
}
