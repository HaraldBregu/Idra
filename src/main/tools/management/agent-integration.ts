import type { AgentTool, AgentToolResult, ToolContext } from '../types';
import { textResult } from '../types';
import { ToolArgumentBuilder } from './argument-builder';
import { redactSensitive } from './audit-log';
import { agentToolToManagedTool, createAgentToolRegistry } from './adapter';
import { ToolDiscovery } from './discovery';
import { ToolExecutor } from './executor';
import { ToolPromptBuilder } from './prompting';
import { isToolIntrospectionRequest, ToolUsePolicy } from './use-policy';
import type { RankedTool, RelevantMemory, SessionContext, ToolExecutionContext } from './types';
import { TOOL_LIMITS } from '../limits';

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
	if (options.enabled === false)
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	const policy = new ToolUsePolicy().evaluate({ userRequest: userMessage });
	if (!policy.shouldUseTools && policy.reason === 'user explicitly disabled tool use') {
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	}
	if (isToolIntrospectionRequest(userMessage.toLowerCase())) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	}
	const threshold =
		options.useWhenToolCountExceeds ?? TOOL_LIMITS.prompt.useSelectionWhenToolCountExceeds;
	if (!options.forceSelection && tools.length <= threshold) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	}
	if (!policy.shouldUseTools)
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	const registry = createAgentToolRegistry(tools);
	const sessionContext = createSessionContext(ctx, options);
	const rankedTools = new ToolDiscovery(registry).discover({
		userIntent: userMessage,
		sessionContext,
		memory: options.memory,
		topN: options.maxPromptTools ?? TOOL_LIMITS.prompt.defaultMaxTools,
	});
	const selectedNames = new Set(rankedTools.map((entry) => entry.tool.name));
	for (const toolName of selectGoogleCalendarToolNames(tools, userMessage)) {
		selectedNames.add(toolName);
	}
	const addedPrerequisites = addPrerequisiteToolNames(selectedNames, tools);
	const toolsForPrompt = tools.filter((tool) => selectedNames.has(tool.name));
	const rankedToolsForPrompt = appendPrerequisiteRankedTools(
		rankedTools,
		registry,
		addedPrerequisites
	);
	const systemPromptSuffix =
		rankedToolsForPrompt.length > 0
			? new ToolPromptBuilder().buildCompactPrompt(rankedToolsForPrompt)
			: '';
	return { toolsForPrompt, systemPromptSuffix, rankedTools: rankedToolsForPrompt };
}

const TOOL_PREREQUISITES: Record<string, string[]> = {
	write: ['read'],
	edit: ['read'],
	apply_patch: ['read'],
	delete: ['read'],
	copy: ['read'],
	move: ['read'],
};

function selectGoogleCalendarToolNames(tools: AgentTool[], userMessage: string): Set<string> {
	const request = userMessage.toLowerCase();
	if (!/\b(google calendar|calendar|agenda|availability|available|free|busy|meetings?|events?|appointments?|schedule)\b/.test(request)) {
		return new Set();
	}

	const suffixes = new Set<string>(['list_calendars', 'search_events']);
	if (/\b(fetch|read|details?|open)\b/.test(request)) {
		suffixes.add('read_event');
		suffixes.add('fetch');
	}
	if (/\b(create|add|schedule|book|new)\b/.test(request)) suffixes.add('create_event');
	if (/\b(update|reschedule|move|change|edit|modify)\b/.test(request)) suffixes.add('update_event');
	if (/\b(delete|cancel|remove)\b/.test(request)) suffixes.add('delete_event');

	return new Set(
		tools
			.filter(isGoogleCalendarTool)
			.filter((tool) => [...suffixes].some((suffix) => tool.name.endsWith(`_${suffix}`)))
			.map((tool) => tool.name)
	);
}

function isGoogleCalendarTool(tool: AgentTool): boolean {
	const text = `${tool.name} ${tool.description}`.toLowerCase();
	return text.includes('google calendar') || text.includes('google_calendar');
}

function addPrerequisiteToolNames(selectedNames: Set<string>, tools: AgentTool[]): Set<string> {
	const availableNames = new Set(tools.map((tool) => tool.name));
	const added = new Set<string>();
	for (const name of [...selectedNames]) {
		for (const prerequisite of TOOL_PREREQUISITES[name] ?? []) {
			if (!availableNames.has(prerequisite) || selectedNames.has(prerequisite)) continue;
			selectedNames.add(prerequisite);
			added.add(prerequisite);
		}
	}
	return added;
}

function appendPrerequisiteRankedTools(
	rankedTools: RankedTool[],
	registry: ReturnType<typeof createAgentToolRegistry>,
	addedPrerequisites: Set<string>
): RankedTool[] {
	if (addedPrerequisites.size === 0) return rankedTools;
	const existing = new Set(rankedTools.map((entry) => entry.tool.name));
	const out = [...rankedTools];
	for (const name of addedPrerequisites) {
		if (existing.has(name)) continue;
		const tool = registry.listTools().find((candidate) => candidate.name === name);
		if (!tool) continue;
		out.push({
			tool,
			score: 0,
			explanations: ['required prerequisite for selected file tool'],
		});
	}
	return out;
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
	const built = builder.build(managed, {
		intendedCall: args,
		sessionContext,
		memory: options.memory,
	});
	if (built.type === 'clarificationRequired') return textResult(built.question, true);
	const executor =
		options.executor ?? new ToolExecutor({ maxToolCallsPerTurn: options.maxToolCallsPerTurn });
	const result = await executor.execute(
		managed,
		built.input,
		createExecutionContext(ctx, sessionContext, options, tool.name, managed.id, built.input)
	);
	if (result.success && result.data) {
		if (result.warnings.length === 0) return result.data;
		return {
			...result.data,
			content: [
				...result.data.content,
				{ type: 'text', text: `tool warnings: ${result.warnings.join('; ')}` },
			],
		};
	}
	return textResult(result.error?.message ?? 'tool failed', true);
}

function createSessionContext(
	ctx: ToolContext,
	options: AgentToolManagementOptions
): SessionContext {
	return {
		userId: options.sessionContext?.userId,
		sessionId: ctx.sessionId,
		userTimezone:
			options.userTimezone ??
			options.sessionContext?.userTimezone ??
			Intl.DateTimeFormat().resolvedOptions().timeZone,
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
		signal: ctx.signal,
		reasonForUse: 'model selected tool',
		turnId: ctx.sessionId,
		metadata: { legacyToolContext: ctx, ...sessionContext.metadata },
		async requestConfirmation() {
			return true;
		},
	};
}
