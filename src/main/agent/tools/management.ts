import type { AgentTool, AgentToolResult, ToolContext } from './core/types';
import { PolicyService, type PolicyServicePort } from '../policy';

const defaultPolicyService = new PolicyService();

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
	readonly maxToolCallsPerTurn?: number;

	constructor(options: { maxToolCallsPerTurn?: number } = {}) {
		this.maxToolCallsPerTurn = options.maxToolCallsPerTurn;
	}
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
	constructor(
		private readonly policy: Pick<PolicyServicePort, 'evaluateToolRequest'> = defaultPolicyService
	) {}

	evaluate(_options: { userRequest: string }): { shouldUseTools: boolean; reason: string } {
		return this.policy.evaluateToolRequest(_options);
	}
}
