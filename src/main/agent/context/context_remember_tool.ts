import type { AgentContext, ToolContextState } from './context_types';

export function rememberTool(context: AgentContext | undefined, state: ToolContextState): void {
	if (!context) return;
	(context.tools ??= []).push(state);
}
