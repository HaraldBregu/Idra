import type { AgentTool, AgentToolResult, ToolContext } from '../types';
import { textResult } from '../types';
import { ToolArgumentBuilder } from './argument-builder';
import { redactSensitive } from './audit-log';
import { agentToolToManagedTool, createAgentToolRegistry } from './adapter';
import { ToolDiscovery } from './discovery';
import { ToolExecutor } from './executor';
import { ToolPromptBuilder } from './prompting';
import { ToolUsePolicy } from './use-policy';
import type { RankedTool, RelevantMemory, SessionContext, ToolExecutionContext } from './types';

export interface AgentToolManagementOptions {
	enabled?: boolean;
	forceSelection?: boolean;
	useWhenToolCountExceeds?: number;
	maxPromptTools?: number;
	maxToolCallsPerTurn?: number;
	availablePermissions?: string[];
	userTimezone?: string;
	memory?: RelevantMemory;
	sessionContext?: Partial<SessionContext>;
	executor?: ToolExecutor;
	argumentBuilder?: ToolArgumentBuilder;
}

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: RankedTool[];
}

export function selectAgentToolsForTurn(
	tools: AgentTool[],
	userMessage: string,
	ctx: ToolContext,
	options: AgentToolManagementOptions = {}
): AgentToolSelectionForTurn {
	if (options.enabled === false) return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	const policy = new ToolUsePolicy().evaluate({ userRequest: userMessage });
	if (!policy.shouldUseTools && policy.reason === 'user explicitly disabled tool use') {
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	}
	const threshold = options.useWhenToolCountExceeds ?? 12;
	if (!options.forceSelection && tools.length <= threshold) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	}
	if (!policy.shouldUseTools) return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	const registry = createAgentToolRegistry(tools);
	const sessionContext = createSessionContext(ctx, options);
	const rankedTools = new ToolDiscovery(registry).discover({
		userIntent: userMessage,
		sessionContext,
		memory: options.memory,
		topN: options.maxPromptTools ?? 6,
	});
	const selectedNames = new Set(rankedTools.map((entry) => entry.tool.name));
	const toolsForPrompt = tools.filter((tool) => selectedNames.has(tool.name));
	const systemPromptSuffix = rankedTools.length > 0 ? new ToolPromptBuilder().buildCompactPrompt(rankedTools) : '';
	return { toolsForPrompt, systemPromptSuffix, rankedTools };
}

export async function executeAgentToolWithManagement(
	tool: AgentTool,
	args: unknown,
	ctx: ToolContext,
	options: AgentToolManagementOptions = {}
): Promise<AgentToolResult> {
	const managed = agentToolToManagedTool(tool);
	const sessionContext = createSessionContext(ctx, options);
	const builder = options.argumentBuilder ?? new ToolArgumentBuilder();
	const built = builder.build(managed, { intendedCall: args, sessionContext, memory: options.memory });
	if (built.type === 'clarificationRequired') return textResult(built.question, true);
	const executor = options.executor ?? new ToolExecutor({ maxToolCallsPerTurn: options.maxToolCallsPerTurn });
	const result = await executor.execute(
		managed,
		built.input,
		createExecutionContext(ctx, sessionContext, options, tool.name, managed.id, built.input)
	);
	if (result.success && result.data) {
		if (result.warnings.length === 0) return result.data;
		return {
			...result.data,
			content: [...result.data.content, { type: 'text', text: `tool warnings: ${result.warnings.join('; ')}` }],
		};
	}
	return textResult(result.error?.message ?? 'tool failed', true);
}

function createSessionContext(ctx: ToolContext, options: AgentToolManagementOptions): SessionContext {
	return {
		userId: options.sessionContext?.userId,
		sessionId: ctx.sessionId,
		userTimezone: options.userTimezone ?? options.sessionContext?.userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
		availablePermissions: new Set(options.availablePermissions ?? ['*']),
		confirmedActionIds: options.sessionContext?.confirmedActionIds,
		privacyConstraints: options.sessionContext?.privacyConstraints,
		safetyConstraints: options.sessionContext?.safetyConstraints,
		metadata: options.sessionContext?.metadata,
	};
}

function createExecutionContext(
	ctx: ToolContext,
	sessionContext: SessionContext,
	options: AgentToolManagementOptions,
	toolName: string,
	managedToolId: string,
	input: unknown
): ToolExecutionContext {
	const confirmedActionIds = new Set(options.sessionContext?.confirmedActionIds ?? []);
	const legacyApprovalKey = `${toolName}::${JSON.stringify(input ?? {})}`;
	if (ctx.approvalCache.has(legacyApprovalKey)) {
		confirmedActionIds.add(`${managedToolId}:${JSON.stringify(redactSensitive(input))}`);
	}
	return {
		userId: sessionContext.userId,
		sessionId: ctx.sessionId,
		userTimezone: sessionContext.userTimezone,
		now: new Date(),
		availablePermissions: sessionContext.availablePermissions,
		confirmedActionIds,
		reasonForUse: 'model selected tool',
		turnId: ctx.sessionId,
		metadata: { legacyToolContext: ctx, ...sessionContext.metadata },
		async requestConfirmation(request) {
			const decision = ctx.approveStream
				? await ctx.approveStream.ask(
						`Approve ${request.toolName}? ${request.reason}`,
						request.inputPreview,
						request.toolName
					)
				: null;
			return decision === 'allow-once' || decision === 'allow-always';
		},
	};
}
