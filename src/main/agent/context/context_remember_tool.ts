import type { ToolContextState, ToolsContext } from './context_types';

export function rememberTool(context: ToolsContext | undefined, state: ToolContextState): void {
	if (!context) return;
	(context.tools ??= []).push(state);
}
