import type { AgentTool, AgentToolResult, ToolContext } from './types';
import { blockedToolResult } from './types';
import { createDefaultToolRegistry, localToolCatalogByName } from './registry';
import { evaluateToolAccess, type ToolProfile } from './access';

export interface ToolServiceOptions {
	cron?: unknown;
	logger?: { info(source: string, message: string, data?: unknown): void; warn(source: string, message: string, data?: unknown): void; error(source: string, message: string, data?: unknown): void };
}

export interface DefaultToolPolicy {
	profile?: ToolProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
}

export interface CallTracker {
	calls: Map<string, number>;
}

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: AgentTool[];
}

export interface AgentToolManagementOptions {
	enabled?: boolean;
	maxToolsForPrompt?: number;
	maxToolCallsPerTurn?: number;
	forceSelection?: boolean;
}

export interface ToolRunPreparation extends AgentToolSelectionForTurn {
	management: AgentToolManagementOptions;
}

export interface BeforeCallOutcome {
	allowed: boolean;
	reason?: string;
}

export interface ToolServicePort {
	getToolRegistry(): ReturnType<typeof localToolCatalogByName>;
	getToolsByGroup(group: string): AgentTool[];
	createDefaultTools(input: { toolPolicy?: DefaultToolPolicy; denylist?: string[] }): AgentTool[];
	filterToolsByAllowlist(tools: AgentTool[], allowlist: string[] | undefined): AgentTool[];
	filterToolsByDenylist(tools: AgentTool[], denylist: string[] | undefined): AgentTool[];
	createCallTracker(): CallTracker;
	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions;
	prepareToolsForProvider(tools: AgentTool[], ctx: ToolContext): AgentTool[];
	selectToolsForTurn(tools: AgentTool[], message: string, ctx: ToolContext, options?: AgentToolManagementOptions): AgentToolSelectionForTurn;
	prepareToolsForRun(input: { tools: AgentTool[]; ctx: ToolContext; userMessage: string; management?: AgentToolManagementOptions }): ToolRunPreparation;
	beforeCall(tool: AgentTool, args: unknown, ctx: ToolContext, tracker: CallTracker): Promise<BeforeCallOutcome>;
	executeToolWithManagement(tool: AgentTool, args: Record<string, unknown>, ctx: ToolContext, management: AgentToolManagementOptions): Promise<AgentToolResult>;
}

export class ToolService implements ToolServicePort {
	constructor(private readonly options: ToolServiceOptions = {}) {}

	getToolRegistry(): ReturnType<typeof localToolCatalogByName> {
		return localToolCatalogByName();
	}

	getToolsByGroup(_group: string): AgentTool[] {
		return [...createDefaultToolRegistry().values()];
	}

	createDefaultTools(input: { toolPolicy?: DefaultToolPolicy; denylist?: string[] }): AgentTool[] {
		const tools = [...createDefaultToolRegistry().values()];
		return this.filterToolsByDenylist(
			this.filterToolsByAllowlist(tools, input.toolPolicy?.allow),
			[...(input.toolPolicy?.deny ?? []), ...(input.denylist ?? [])]
		);
	}

	filterToolsByAllowlist(tools: AgentTool[], allowlist: string[] | undefined): AgentTool[] {
		if (!allowlist?.length) return tools;
		const allowed = new Set(allowlist);
		return tools.filter((tool) => allowed.has(tool.name));
	}

	filterToolsByDenylist(tools: AgentTool[], denylist: string[] | undefined): AgentTool[] {
		if (!denylist?.length) return tools;
		const denied = new Set(denylist);
		return tools.filter((tool) => !denied.has(tool.name));
	}

	createCallTracker(): CallTracker {
		return { calls: new Map() };
	}

	createManagementOptions(options: AgentToolManagementOptions = {}): AgentToolManagementOptions {
		return { maxToolsForPrompt: 9, maxToolCallsPerTurn: 25, ...options };
	}

	prepareToolsForProvider(tools: AgentTool[]): AgentTool[] {
		return tools;
	}

	selectToolsForTurn(tools: AgentTool[], _message: string, _ctx: ToolContext, options: AgentToolManagementOptions = {}): AgentToolSelectionForTurn {
		const limit = options.maxToolsForPrompt ?? 9;
		const toolsForPrompt = tools.slice(0, limit);
		return { toolsForPrompt, rankedTools: tools, systemPromptSuffix: '' };
	}

	prepareToolsForRun(input: { tools: AgentTool[]; ctx: ToolContext; userMessage: string; management?: AgentToolManagementOptions }): ToolRunPreparation {
		const management = this.createManagementOptions(input.management);
		return { ...this.selectToolsForTurn(input.tools, input.userMessage, input.ctx, management), management };
	}

	async beforeCall(tool: AgentTool, _args: unknown, ctx: ToolContext, tracker: CallTracker): Promise<BeforeCallOutcome> {
		tracker.calls.set(tool.name, (tracker.calls.get(tool.name) ?? 0) + 1);
		return evaluateToolAccess({ tool, ctx });
	}

	async executeToolWithManagement(tool: AgentTool, args: Record<string, unknown>, ctx: ToolContext): Promise<AgentToolResult> {
		const approval = typeof tool.needsApproval === 'function' ? await tool.needsApproval(args, ctx) : tool.needsApproval;
		if (approval && !ctx.approvalCache?.has(tool.name)) return blockedToolResult(`Tool ${tool.name} requires approval.`);
		return tool.execute(args, ctx);
	}
}
