import type { AgentTool, AgentToolResult, ToolContext } from './core/types';

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: AgentTool[];
}

export interface AgentToolManagementOptions {
	executor?: ToolExecutor;
	maxToolCallsPerTurn?: number;
	enabled?: boolean;
	forceSelection?: boolean;
	maxPromptTools?: number;
}

export class ToolExecutor {
	constructor(_options: { maxToolCallsPerTurn?: number } = {}) {}
}

export function selectAgentToolsForTurn(
	tools: AgentTool[],
	_message: string,
	_ctx: ToolContext,
	options?: AgentToolManagementOptions
): AgentToolSelectionForTurn {
	const maxTools = options?.maxPromptTools;
	const toolsForPrompt = maxTools !== undefined ? tools.slice(0, maxTools) : tools;
	return { toolsForPrompt, systemPromptSuffix: '', rankedTools: tools };
}

export async function executeAgentToolWithManagement(
	tool: AgentTool,
	args: Record<string, unknown>,
	ctx: ToolContext,
	_management: AgentToolManagementOptions
): Promise<AgentToolResult> {
	return tool.execute(args, ctx);
}

export class ToolUsePolicy {
	evaluate(_options: { userRequest: string }): { shouldUseTools: boolean; reason: string } {
		return { shouldUseTools: true, reason: '' };
	}
}
