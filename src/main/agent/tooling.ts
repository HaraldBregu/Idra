import type { AgentToolResult } from './types';

export type {
	AgentTool,
	AgentToolManagementOptions,
	AgentToolResult,
	AgentToolSelectionForTurn,
	CronToolContext,
	FridayServices,
	PlanEntry,
	ToolContext,
	ToolRunPreparation,
	ToolsServicePort,
} from './types';

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
