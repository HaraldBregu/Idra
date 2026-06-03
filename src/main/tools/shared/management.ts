import type { AgentTool, AgentToolResult, ToolContext } from '../base/tool';
import { ToolPolicyService, type ToolPolicyServicePort } from './tool-types';

const defaultToolPolicyService = new ToolPolicyService();
const GENERIC_TOOL_ACTION_TOKENS = new Set([
	'read',
	'write',
	'edit',
	'create',
	'delete',
	'copy',
	'move',
	'find',
	'search',
	'show',
	'list',
	'open',
	'run',
	'execute',
]);

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
	message: string,
	_ctx: ToolContext,
	options?: AgentToolManagementOptions
): AgentToolSelectionForTurn {
	if (tools.length === 0 || hasNoToolIntent(message) || isImmediateBackgroundTask(message)) {
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	}
	if (isToolInventoryQuestion(message)) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: tools };
	}

	const ranked = rankToolsForPrompt(tools, message);
	const matched = ranked.filter((entry) => entry.score > 0).map((entry) => entry.tool);
	const maxTools = options?.maxPromptTools;
	const capped = maxTools !== undefined ? matched.slice(0, maxTools) : matched;
	return { toolsForPrompt: capped, systemPromptSuffix: '', rankedTools: matched };
}

function rankToolsForPrompt(
	tools: readonly AgentTool[],
	message: string
): Array<{ tool: AgentTool; score: number }> {
	const tokens = tokenizeForCapabilityMatch(message);
	return tools
		.map((tool) => ({ tool, score: scoreTool(tool, tokens) }))
		.sort(
			(left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name)
		);
}

function scoreTool(tool: AgentTool, queryTokens: ReadonlySet<string>): number {
	const toolTokens = tokenizeForCapabilityMatch(toolText(tool));
	let score = 0;
	for (const token of queryTokens) {
		if (GENERIC_TOOL_ACTION_TOKENS.has(token)) continue;
		if (toolTokens.has(token)) score += 8;
		else if (
			[...toolTokens].some((toolToken) => toolToken.includes(token) || token.includes(toolToken))
		)
			score += 3;
	}
	return score;
}

function toolText(tool: AgentTool): string {
	return [tool.name, tool.displayName, tool.displaySummary, tool.description]
		.filter(Boolean)
		.join(' ');
}

function hasNoToolIntent(message: string): boolean {
	return /\b(do not use tools|don't use tools|without tools|answer from memory|no tools)\b/i.test(
		message
	);
}

function isToolInventoryQuestion(message: string): boolean {
	return /\b(what tools do you have|do you have (?:any )?(?:internal )?tools|available tools|list tools|tool inventory)\b/i.test(
		message
	);
}

function isImmediateBackgroundTask(message: string): boolean {
	return /\brun a task in background(?: now)?\b/i.test(message);
}

function tokenizeForCapabilityMatch(value: string): ReadonlySet<string> {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
	if (!normalized) return new Set();
	return new Set(normalized.split(/\s+/).filter((token) => token.length >= 3));
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
		private readonly policy: Pick<
			ToolPolicyServicePort,
			'evaluateToolRequest'
		> = defaultToolPolicyService
	) {}

	evaluate(_options: { userRequest: string }): { shouldUseTools: boolean; reason: string } {
		return this.policy.evaluateToolRequest(_options);
	}
}
